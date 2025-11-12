import React, { useState, useMemo, useCallback, useEffect, createContext, useContext } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Calendar, 
  Activity, Target, X, ChevronsUpDown, ChevronDown, ChevronUp, 
  Home, Shield, ArrowLeft, FileText, Settings, Edit, Trash2, Plus, Save, Download, Upload, Fingerprint, User,
  AlertTriangle, CheckCircle, Clock, DollarSign, List, Sun, Moon, RefreshCw, Lock, Unlock, CalendarRange, CheckSquare,
  PieChart, Percent, ShieldOff // 'ShieldOff' Adicionado
} from 'lucide-react';

// --- CONTEXTO DE TEMA ---
const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

// --- DADOS INICIAIS (Exemplo enriquecido) ---
const initialTransfersData = [
  { 
    id: 1, playerId: 'almada_thiago', year: 2024, name: 'Thiago Almada', position: 'MO', type: 'buy', value: 24150000, marketValue: 25000000, club: 'Atlanta United',
    // 'age' removido, 'dob' (Data de Nascimento) adicionado
    dob: '2001-04-26', // Data de Nascimento
    photoUrl: 'https://placehold.co/100x100/2d3748/ffffff?text=Almada',
    contractStartDate: '2024-07-01', contractEndDate: '2029-06-30',
    currency: 'USD', originalValue: 26000000, exchangeRate: 1.07, isFixedRate: false,
    paymentMethod: 'Parcelado', installments: 4,
    installmentsDetails: [
      { number: 1, value: 6037500, date: '2024-07-15', status: 'paid' },
      { number: 2, value: 6037500, date: '2025-01-15', status: 'pending' },
      { number: 3, value: 6037500, date: '2025-07-15', status: 'pending' },
      { number: 4, value: 6037500, date: '2026-01-15', status: 'pending' }
    ],
    playerBonus: 2000000, playerBonusDate: '2024-08-01', 
    agentBonus: 1500000, agentBonusDate: '2024-08-01',
    intermediaries: [{ name: 'Empresa X', value: 500000 }],
    triggers: [
      // Campo 'date' (prazo) removido, 'paymentDate' (data de pagamento) adicionado
      { description: 'Campeão Libertadores', status: 'pending', value: 1000000, isPaid: false, paymentDate: '' }
    ],
    // NOVO: Controle de Propriedade
    is100percent: false,
    safPercentage: 70,
    otherOwners: [
      { name: 'Atlanta United', percentage: 20 },
      { name: 'Próprio Atleta', percentage: 10 }
    ],
    // NOVO: Campos Salário
    salaryCLT: 250000,
    salaryImage: 100000,
    hasProgressiveRaise: true,
    progressiveRaises: [
      { value: 10, unit: '%', date: '2025-07-01' },
      { value: 50000, unit: 'BRL', date: '2026-07-01' }
    ]
  },
  { id: 2, playerId: 'henrique_luiz', year: 2024, name: 'Luiz Henrique', position: 'AD', type: 'buy', value: 16000000, marketValue: 15000000, club: 'Real Betis', dob: '2001-01-02', photoUrl: 'https://placehold.co/100x100/2d3748/ffffff?text=L.+Henrique', contractStartDate: '2024-02-01', contractEndDate: '2028-12-31', is100percent: true, safPercentage: 100, salaryCLT: 200000, salaryImage: 80000, hasProgressiveRaise: false, progressiveRaises: [] },
];

const POSITION_ORDER = ['G', 'Z', 'LE', 'LD', 'V', 'MO', 'AE', 'AD', 'AC'];
const TRIGGER_STATUS = {
  // 'pending' removido
  'hit': { label: 'Atingido', color: 'text-green-500', icon: CheckCircle },
  'missed': { label: 'Não Atingido', color: 'text-red-500', icon: X }
};
const CURRENCIES = {
  'EUR': { label: '€ (EUR)', symbol: '€' },
  'BRL': { label: 'R$ (BRL)', symbol: 'R$' },
  'USD': { label: '$ (USD)', symbol: '$' },
  'GBP': { label: '£ (GBP)', symbol: '£' }
};
// NOVOS TIPOS DE CONTRATO
const CONTRACT_TYPES = {
  'buy': { label: 'Compra', color: 'bg-blue-500/10 text-blue-500', fieldColor: '#3b82f6' },
  'sale': { label: 'Venda', color: 'bg-red-500/10 text-red-500', fieldColor: '#ef4444' },
  'loan_in': { label: 'Empréstimo (Chegada)', color: 'bg-teal-500/10 text-teal-500', fieldColor: '#14b8a6' },
  'loan_out': { label: 'Empréstimo (Saída)', color: 'bg-orange-500/10 text-orange-500', fieldColor: '#f97316' },
  'free': { label: 'Livre', color: 'bg-green-500/10 text-green-500', fieldColor: '#10b981' },
};
const getTypeProps = (type) => {
  return CONTRACT_TYPES[type] || CONTRACT_TYPES['free'];
};

// Funções Helper
const formatCurrency = (value, showM = true) => {
  if (value === 0 || value === null || isNaN(value)) return 'Livre';
  if (showM) {
    const valM = value / 1000000;
    return `€${valM.toFixed(1)}M`;
  }
  // ATENÇÃO: Esta função formata como EUR (€). Pode precisar de ajuste se a moeda base mudar.
  return `€${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
};
const isOverdue = (dateString) => {
  if (!dateString) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dateString + 'T00:00:00'); 
  return due < today;
};

// NOVO: Checa se vence em breve (hoje ou nos próximos X dias)
const isCloseToDue = (dateString, days = 30) => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normaliza hoje
  const dueDate = new Date(dateString + 'T00:00:00');
  
  // Se já passou (é ontem ou antes), não está "próximo de vencer", está "atrasado"
  if (dueDate < today) return false; 

  const timeDiff = dueDate.getTime() - today.getTime();
  const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // É hoje ou nos próximos 30 dias?
  return dayDiff >= 0 && dayDiff <= days; 
};

// NOVO: Helper para status de parcela
const getInstallmentStatusProps = (inst) => {
  if (inst.status === 'paid') {
    return { label: 'Pago', color: 'text-green-500', icon: CheckCircle };
  }
  
  if (isOverdue(inst.date)) {
    return { label: 'Atrasado', color: 'text-red-500', icon: AlertTriangle };
  }
  
  // O '30' pode ser ajustado
  if (isCloseToDue(inst.date, 30)) { 
    return { label: 'Vence em breve', color: 'text-orange-500', icon: Clock };
  }

  // Se não está pago, nem atrasado, nem vencendo em breve
  return { label: 'Pendente', color: 'text-yellow-500', icon: Clock };
};


// NOVO: Cálculo de Idade
const calculateAge = (dob, referenceYear) => {
  if (!dob) return '?';
  const birthDate = new Date(dob);
  // Usamos uma data de referência no meio do ano para melhor aproximação
  const referenceDate = new Date(`${referenceYear}-07-01T00:00:00`); 
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const m = referenceDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getMockExchangeRate = (currency) => {
  switch(currency) {
    case 'BRL': return 6.15; 
    case 'USD': return 1.08; 
    case 'GBP': return 0.85;
    default: return 1;
  }
};


// --- COMPONENTES UI REUTILIZÁVEIS ---
const KpiCard = ({ icon: Icon, title, value, footer, colorClass }) => {
  const { isDark } = useTheme();
  return (
    <div className={`rounded-2xl p-4 border transition-colors ${colorClass} ${isDark ? 'bg-opacity-20' : 'bg-opacity-50 bg-white shadow-sm'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-80" />
        <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{footer}</div>
    </div>
  );
};

const SortableTh = ({ children, name, sortConfig, onSort, align = 'left' }) => {
  const { isDark } = useTheme();
  const isSorted = sortConfig.key === name;
  const direction = isSorted ? sortConfig.direction : 'none';
  const getIcon = () => {
    if (direction === 'ascending') return <ChevronUp className="w-4 h-4 ml-1" />;
    if (direction === 'descending') return <ChevronDown className="w-4 h-4 ml-1" />;
    return <ChevronsUpDown className={`w-4 h-4 ml-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />;
  };
  return (
    <th className={`px-6 py-4 text-${align} text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
      <button className={`flex items-center transition-colors ${align === 'right' ? 'ml-auto' : ''} ${isDark ? 'hover:text-white' : 'hover:text-black'}`} onClick={() => onSort(name)}>
        {children}{getIcon()}
      </button>
    </th>
  );
};

// --- NOVO: Sub-formulário Detalhado para Transferência ---
const TransferSubForm = ({ transfer, onSave, onCancel }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState(transfer || {
    type: 'buy', year: new Date().getFullYear(), club: '', position: 'G',
    value: 0, marketValue: 0,
    contractStartDate: '', contractEndDate: '',
    currency: 'EUR', originalValue: 0, exchangeRate: 1, isFixedRate: false,
    paymentMethod: 'À vista', installments: 1,
    installmentsDetails: [], 
    playerBonus: 0, playerBonusDate: '', agentBonus: 0, agentBonusDate: '',
    intermediaries: [], triggers: [],
    // NOVO: Campos de Propriedade
    is100percent: true, safPercentage: 100, otherOwners: [],
    // NOVO: Campos Salário
    salaryCLT: 0,
    salaryImage: 0,
    hasProgressiveRaise: false,
    progressiveRaises: [],
    // NOVO: Cláusula de Vencimento Antecipado
    hasAccelerationClause: false
  });
  const [activeTab, setActiveTab] = useState('geral');

  const modalInputStyle = `w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isDark ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-600 disabled:bg-gray-950 disabled:text-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-400'}`;
  const modalLabelStyle = `block text-xs mb-1.5 uppercase tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  useEffect(() => {
    if (formData.currency === 'EUR') {
      setFormData(prev => ({ ...prev, value: prev.originalValue, exchangeRate: 1 }));
    } else {
      const eurValue = formData.originalValue && formData.exchangeRate ? (formData.originalValue / formData.exchangeRate) : 0;
      setFormData(prev => ({ ...prev, value: eurValue }));
    }
  }, [formData.originalValue, formData.currency, formData.exchangeRate]);

  const fetchExchangeRate = () => {
    const rate = getMockExchangeRate(formData.currency);
    setFormData(prev => ({ ...prev, exchangeRate: rate }));
  };

  // --- GERADOR DE PARCELAS ---
  const generateInstallments = () => {
    const count = Number(formData.installments) || 1;
    if (count < 1) return;
    const totalValue = Number(formData.value) || 0;
    const installmentValue = totalValue / count;
    const today = new Date();
    
    const newInstallments = Array.from({ length: count }, (_, i) => {
      const date = new Date(today);
      date.setMonth(today.getMonth() + (i * 6)); // Default 6 meses
      return {
        number: i + 1,
        value: installmentValue,
        date: date.toISOString().split('T')[0],
        status: 'pending'
      };
    });
    setFormData(prev => ({ ...prev, installmentsDetails: newInstallments }));
  };

  const updateInstallment = (idx, field, val) => {
    setFormData(prev => ({
      ...prev,
      installmentsDetails: prev.installmentsDetails.map((item, i) => i === idx ? { ...item, [field]: val } : item)
    }));
  };
  // NOVO: Remover Parcela
  const removeInstallment = (idx) => {
    setFormData(prev => ({
      ...prev,
      installmentsDetails: prev.installmentsDetails.filter((_, i) => i !== idx)
    }));
  };

  const addIntermediary = () => setFormData(prev => ({ ...prev, intermediaries: [...(prev.intermediaries || []), { name: '', value: 0 }] }));
  const removeIntermediary = (idx) => setFormData(prev => ({ ...prev, intermediaries: prev.intermediaries.filter((_, i) => i !== idx) }));
  const updateIntermediary = (idx, field, val) => setFormData(prev => ({ ...prev, intermediaries: prev.intermediaries.map((item, i) => i === idx ? { ...item, [field]: val } : item) }));

  // ATUALIZADO: addTrigger usa 'missed' como padrão, pois 'pending' foi removido
  const addTrigger = () => setFormData(prev => ({ ...prev, triggers: [...(prev.triggers || []), { description: '', status: 'missed', value: 0, isPaid: false, paymentDate: '', currency: 'EUR' }] }));
  const removeTrigger = (idx) => setFormData(prev => ({ ...prev, triggers: prev.triggers.filter((_, i) => i !== idx) }));
  const updateTrigger = (idx, field, val) => setFormData(prev => ({ ...prev, triggers: prev.triggers.map((item, i) => i === idx ? { ...item, [field]: val } : item) }));

  // NOVO: Gerenciamento de Propriedade
  const addOwner = () => setFormData(prev => ({ ...prev, otherOwners: [...(prev.otherOwners || []), { name: '', percentage: 0 }] }));
  const removeOwner = (idx) => setFormData(prev => ({ ...prev, otherOwners: prev.otherOwners.filter((_, i) => i !== idx) }));
  const updateOwner = (idx, field, val) => setFormData(prev => ({ ...prev, otherOwners: prev.otherOwners.map((item, i) => i === idx ? { ...item, [field]: val } : item) }));
  const totalOwnedPercentage = useMemo(() => {
    if (formData.is100percent) return 100;
    const others = formData.otherOwners?.reduce((sum, o) => sum + Number(o.percentage || 0), 0) || 0;
    return Number(formData.safPercentage || 0) + others;
  }, [formData.is100percent, formData.safPercentage, formData.otherOwners]);

  // NOVO: Gerenciamento de Aumento Salarial
  const addRaise = () => setFormData(prev => ({ ...prev, progressiveRaises: [...(prev.progressiveRaises || []), { value: 0, unit: '%', date: '' }] }));
  const removeRaise = (idx) => setFormData(prev => ({ ...prev, progressiveRaises: prev.progressiveRaises.filter((_, i) => i !== idx) }));
  const updateRaise = (idx, field, val) => setFormData(prev => ({ ...prev, progressiveRaises: prev.progressiveRaises.map((item, i) => i === idx ? { ...item, [field]: val } : item) }));


  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      ...formData, id: formData.id || Date.now(), 
      value: Number(formData.value), marketValue: Number(formData.marketValue), year: Number(formData.year),
      originalValue: Number(formData.originalValue), exchangeRate: Number(formData.exchangeRate),
      installments: Number(formData.installments), playerBonus: Number(formData.playerBonus), agentBonus: Number(formData.agentBonus),
      safPercentage: Number(formData.safPercentage),
      // Campos de Salário
      salaryCLT: Number(formData.salaryCLT || 0),
      salaryImage: Number(formData.salaryImage || 0)
    });
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[60] backdrop-blur-sm p-4 overflow-y-auto ${isDark ? 'bg-black/80' : 'bg-gray-500/50'}`}>
      <div className={`border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{transfer ? 'Editar Detalhes da Transação' : 'Nova Transação'}</h3>
          <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
            {/* ABA "SALÁRIO" ADICIONADA */}
            {['geral', 'financeiro', 'salario', 'contratos'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${activeTab === tab ? (isDark ? 'bg-white text-black' : 'bg-white text-blue-600 shadow-sm') : (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}`}>{tab}</button>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'geral' && (
            <div className="grid grid-cols-2 gap-4 animate-fadeIn">
               <div><label className={modalLabelStyle}>Ano da Transação</label><input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className={modalInputStyle} /></div>
               <div>
                  <label className={modalLabelStyle}>Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className={modalInputStyle}>
                    {Object.entries(CONTRACT_TYPES).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
               </div>
               <div className="col-span-2"><label className={modalLabelStyle}>Clube Parceiro</label><input type="text" required value={formData.club} onChange={e => setFormData({...formData, club: e.target.value})} className={modalInputStyle} placeholder="Ex: Flamengo" /></div>
               <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-dashed border-gray-700/50">
                  <div><label className={modalLabelStyle}>Início do Contrato</label><input type="date" value={formData.contractStartDate} onChange={e => setFormData({...formData, contractStartDate: e.target.value})} className={modalInputStyle} /></div>
                  <div><label className={modalLabelStyle}>Fim do Contrato</label><input type="date" value={formData.contractEndDate} onChange={e => setFormData({...formData, contractEndDate: e.target.value})} className={modalInputStyle} /></div>
               </div>
               {/* 'Idade' removido */}
               <div><label className={modalLabelStyle}>Posição (na época)</label><select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className={modalInputStyle}>{POSITION_ORDER.map(pos => <option key={pos} value={pos}>{pos}</option>)}</select></div>
            </div>
          )}
          {activeTab === 'financeiro' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3"><label className={modalLabelStyle}>Moeda</label><select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className={modalInputStyle}>{Object.entries(CURRENCIES).map(([code, { label }]) => <option key={code} value={code}>{label}</option>)}</select></div>
                <div className="col-span-5"><label className={modalLabelStyle}>Valor Original</label><div className="relative"><span className={`absolute left-4 top-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{CURRENCIES[formData.currency]?.symbol}</span><input type="number" value={formData.originalValue} onChange={e => setFormData({...formData, originalValue: e.target.value})} className={`${modalInputStyle} pl-12`} /></div></div>
                <div className="col-span-4"><label className={modalLabelStyle}>Valor de Mercado (€)</label><input type="number" value={formData.marketValue} onChange={e => setFormData({...formData, marketValue: e.target.value})} className={modalInputStyle} /></div>
              </div>
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-5">
                  <label className={modalLabelStyle}>Taxa de Câmbio (Qtd/1€)</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.0001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className={modalInputStyle} disabled={formData.currency === 'EUR'} />
                    <button type="button" onClick={fetchExchangeRate} disabled={formData.currency === 'EUR'} className={`p-3 rounded-xl transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-blue-400 disabled:text-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-blue-600 disabled:text-gray-400'}`}><RefreshCw className="w-5 h-5"/></button>
                  </div>
                  {/* NOVO: Texto abaixo do botão */}
                  <span className={`text-xs ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Atualizar câmbio</span>
                </div>
                {/* ATUALIZADO: col-span-3 para col-span-4 e flex-col para os checkboxes */}
                <div className="col-span-3 flex flex-col justify-center h-[48px] gap-2">
                  <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={formData.isFixedRate} onChange={e => setFormData({...formData, isFixedRate: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium flex items-center gap-1">{formData.isFixedRate ? <Lock className="w-3 h-3"/> : <Unlock className="w-3 h-3 text-gray-500"/>} Câmbio Fixado</span>
                  </label>
                  
                  {/* NOVO: Checkbox de Vencimento Antecipado */}
                  <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={formData.hasAccelerationClause} onChange={e => setFormData({...formData, hasAccelerationClause: e.target.checked})} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium flex items-center gap-1">Venc. Antecipado</span>
                  </label>
                </div>
                <div className="col-span-4"><label className={modalLabelStyle}>Valor Final (€)</label><input type="text" value={formatCurrency(formData.value, false)} disabled className={`${modalInputStyle} font-bold opacity-80`} /></div>
              </div>
              <div className={`border-t pt-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={modalLabelStyle}>Forma de Pagamento</label><select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className={modalInputStyle}><option>À vista</option><option>Parcelado</option></select></div>
                  {formData.paymentMethod === 'Parcelado' && (
                    <div className="flex gap-2 items-end">
                      <div className="flex-1"><label className={modalLabelStyle}>Nº de Parcelas</label><input type="number" value={formData.installments} onChange={e => setFormData({...formData, installments: e.target.value})} className={modalInputStyle} min="1" /></div>
                      <button type="button" onClick={generateInstallments} className={`p-3 mb-[1px] rounded-xl font-semibold text-sm transition-colors ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>Gerar Parcelas</button>
                    </div>
                  )}
                </div>
                {/* LISTA DE PARCELAS (Com lixeira) */}
                {formData.paymentMethod === 'Parcelado' && formData.installmentsDetails?.length > 0 && (
                  <div className={`mt-4 p-3 rounded-xl space-y-2 max-h-48 overflow-y-auto custom-scrollbar ${isDark ? 'bg-black/30' : 'bg-gray-50 border border-gray-200'}`}>
                     {formData.installmentsDetails.map((inst, idx) => (
                       <div key={idx} className="flex gap-2 items-center text-sm">
                         <span className={`w-8 font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>#{inst.number}</span>
                         <input type="date" value={inst.date} onChange={e => updateInstallment(idx, 'date', e.target.value)} className={`${modalInputStyle} !py-1.5 !text-sm`} />
                         <input type="number" value={inst.value} onChange={e => updateInstallment(idx, 'value', e.target.value)} className={`${modalInputStyle} !py-1.5 !text-sm flex-1`} />
                         <select value={inst.status} onChange={e => updateInstallment(idx, 'status', e.target.value)} className={`${modalInputStyle} !py-1.5 !text-sm w-28 ${inst.status === 'paid' ? 'text-green-500' : 'text-yellow-500'}`}>
                           <option value="pending">Pendente</option><option value="paid">Pago</option>
                         </select>
                         {/* NOVO: Botão de lixeira */}
                         <button type="button" onClick={() => removeInstallment(idx)} className={`p-1.5 rounded transition-colors ${isDark ? 'text-gray-600 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-600 hover:bg-red-100'}`}><Trash2 className="w-4 h-4"/></button>
                       </div>
                     ))}
                  </div>
                )}
              </div>
              <div className={`border-t pt-4 grid grid-cols-2 gap-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div><label className={modalLabelStyle}>Luvas Jogador (€)</label><input type="number" value={formData.playerBonus} onChange={e => setFormData({...formData, playerBonus: e.target.value})} className={modalInputStyle} /></div>
                <div><label className={modalLabelStyle}>Vencimento Luvas Jog.</label><input type="date" value={formData.playerBonusDate} onChange={e => setFormData({...formData, playerBonusDate: e.target.value})} className={modalInputStyle} /></div>
                <div><label className={modalLabelStyle}>Luvas Intermediário (€)</label><input type="number" value={formData.agentBonus} onChange={e => setFormData({...formData, agentBonus: e.target.value})} className={modalInputStyle} /></div>
                <div><label className={modalLabelStyle}>Vencimento Luvas Int.</label><input type="date" value={formData.agentBonusDate} onChange={e => setFormData({...formData, agentBonusDate: e.target.value})} className={modalInputStyle} /></div>
              </div>
            </div>
          )}
          {/* CONTEÚDO DA NOVA ABA "SALÁRIO" */}
          {activeTab === 'salario' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={modalLabelStyle}>Salário CLT (Valor Mensal €)</label>
                  <input type="number" value={formData.salaryCLT} onChange={e => setFormData({...formData, salaryCLT: e.target.value})} className={modalInputStyle} />
                </div>
                <div>
                  <label className={modalLabelStyle}>Salário Imagem (Valor Mensal €)</label>
                  <input type="number" value={formData.salaryImage} onChange={e => setFormData({...formData, salaryImage: e.target.value})} className={modalInputStyle} />
                </div>
              </div>
              <div className={`border-t pt-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" checked={formData.hasProgressiveRaise} onChange={e => setFormData({...formData, hasProgressiveRaise: e.target.checked})} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">Salário tem aumento progressivo</span>
                </label>
              </div>

              {formData.hasProgressiveRaise && (
                <div className={`mt-4 p-4 rounded-xl space-y-3 border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <label className={`${modalLabelStyle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Aumentos Programados</label>
                    <button type="button" onClick={addRaise} className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>+ Adicionar Aumento</button>
                  </div>
                  {formData.progressiveRaises?.map((raise, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className={modalLabelStyle}>Valor do Aumento</label>
                        <input type="number" value={raise.value} onChange={e => updateRaise(idx, 'value', e.target.value)} className={modalInputStyle} />
                      </div>
                      <div className="w-28">
                        <label className={modalLabelStyle}>Unidade</label>
                        <select value={raise.unit} onChange={e => updateRaise(idx, 'unit', e.target.value)} className={modalInputStyle}>
                          <option value="%">%</option>
                          <option value="BRL">R$</option>
                          <option value="EUR">€</option>
                          <option value="USD">$</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className={modalLabelStyle}>Data do Aumento</label>
                        <input type="date" value={raise.date} onChange={e => updateRaise(idx, 'date', e.target.value)} className={modalInputStyle} />
                      </div>
                      <button type="button" onClick={() => removeRaise(idx)} className={`p-3 mb-[1px] rounded-xl transition-colors ${isDark ? 'text-red-500/80 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-100'}`}><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'contratos' && (
            <div className="space-y-6 animate-fadeIn">
              {/* NOVO: Seção de Propriedade */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className={`${modalLabelStyle} text-purple-500 flex items-center gap-2 text-base`}><PieChart className="w-5 h-5"/> Propriedade Econômica</label>
                  <label className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={formData.is100percent} onChange={e => setFormData({...formData, is100percent: e.target.checked, safPercentage: e.target.checked ? 100 : 70})} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium">100% SAF Botafogo</span>
                  </label>
                </div>

                {!formData.is100percent && (
                  <div className={`p-4 rounded-xl space-y-4 border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                      <label className={modalLabelStyle}>Percentual SAF Botafogo (%)</label>
                      <input type="number" value={formData.safPercentage} onChange={e => setFormData({...formData, safPercentage: e.target.value})} className={modalInputStyle} max="100" min="0" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2"><label className={`${modalLabelStyle} ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Outros Proprietários</label><button type="button" onClick={addOwner} className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>+ Adicionar</button></div>
                      {formData.otherOwners?.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input type="text" placeholder="Nome/Clube" value={item.name} onChange={e => updateOwner(idx, 'name', e.target.value)} className={`${modalInputStyle} flex-1`} />
                          <input type="number" placeholder="% (ex: 20)" value={item.percentage} onChange={e => updateOwner(idx, 'percentage', e.target.value)} className={`${modalInputStyle} w-36`} />
                          <button type="button" onClick={() => removeOwner(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><X className="w-5 h-5"/></button>
                        </div>
                      ))}
                    </div>
                    <div className={`p-3 rounded-lg text-center font-bold ${totalOwnedPercentage !== 100 ? 'text-red-500' : 'text-green-500'} ${isDark ? 'bg-black/30' : 'bg-white'}`}>
                      Total Distribuído: {totalOwnedPercentage}%
                      {totalOwnedPercentage !== 100 && <span className="text-xs font-normal block">(Deve ser 100%)</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de Intermediários */}
                {/* Seção de Gatilhos (ATUALIZADA) */}
                <div className={`border-t pt-4 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center mb-2"><label className={`${modalLabelStyle} text-yellow-500`}>Gatilhos / Bônus de Performance</label><button type="button" onClick={addTrigger} className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}>+ Adicionar Gatilho</button></div>
                {formData.triggers?.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl mb-3 space-y-2 border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    {/* Linha 1: Descrição, Status, Valor, Moeda, Remover */}
                    <div className="flex gap-2">
                      <input type="text" placeholder="Descrição do Gatilho (ex: 20 gols)" value={item.description} onChange={e => updateTrigger(idx, 'description', e.target.value)} className={`${modalInputStyle} flex-1`} />
                      <select value={item.status} onChange={e => updateTrigger(idx, 'status', e.target.value)} className={`${modalInputStyle} w-36`}>
                        {/* 'pending' removido das opções */}
                        <option value="missed">Não Atingido</option>
                        <option value="hit">Atingido</option>
                      </select>
                      <input type="number" placeholder="Valor" value={item.value} onChange={e => updateTrigger(idx, 'value', e.target.value)} className={`${modalInputStyle} w-28`} />
                      
                      {/* NOVO: Seletor de Moeda do Gatilho */}
                      <select 
                        value={item.currency || 'EUR'} 
                        onChange={e => updateTrigger(idx, 'currency', e.target.value)} 
                        className={`${modalInputStyle} w-24`}
                      >
                        {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      
                      <button type="button" onClick={() => removeTrigger(idx)} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash2 className="w-5 h-5"/></button>
                    </div>

                    {/* Linha 2: Condicional para Pagamento */}
                    {item.status === 'hit' && (
                      <div className={`flex items-end gap-3 p-3 rounded-lg ${isDark ? 'bg-black/30' : 'bg-gray-100'}`}>
                        <label className={`flex items-center justify-center gap-2 cursor-pointer p-3 rounded-xl ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} h-[48px]`}>
                          <input 
                              type="checkbox" 
                              checked={item.isPaid} 
                              onChange={e => updateTrigger(idx, 'isPaid', e.target.checked)} 
                              className="w-4 h-4 rounded"
                          />
                          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Pago</span>
                        </label>
                        <div className="flex-1">
                          {/* ATUALIZADO: Label do campo de data */}
                          <label className={modalLabelStyle}>Data de Pagamento Acordada</label>
                          <input 
                            type="date" 
                            value={item.paymentDate || ''} 
                            onChange={e => updateTrigger(idx, 'paymentDate', e.target.value)} 
                            className={`${modalInputStyle} !py-2.5`} // Ajustado padding para alinhar
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
        <div className={`p-6 border-t flex justify-end gap-3 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <button type="button" onClick={onCancel} className={`px-4 py-2 border rounded-lg text-sm transition-colors ${isDark ? 'bg-transparent border-gray-700 hover:bg-gray-800 text-white' : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'}`}>Cancelar</button>
            <button onClick={handleSubmit} className={`px-6 py-2 font-bold rounded-lg text-sm transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Confirmar Alterações</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE: Master Player Editor ---
const MasterPlayerEditor = ({ playerGroup, existingPlayers, onSave, onCancel }) => {
  const { isDark } = useTheme();
  // NOVO: 'dob' (Data de Nascimento) adicionado, 'defaultPosition' mantido
  const [playerInfo, setPlayerInfo] = useState({ 
    name: playerGroup?.name || '', 
    playerId: playerGroup?.playerId || '', 
    photoUrl: playerGroup?.photoUrl || 'https://placehold.co/100x100/2d3748/ffffff?text=Foto', 
    defaultPosition: playerGroup?.transactions?.[0]?.position || 'G',
    dob: playerGroup?.transactions?.[0]?.dob || '' // Pega o DOB da primeira transação (assumindo que é o mesmo)
  });
  const [transactions, setTransactions] = useState(playerGroup?.transactions || []);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [showTransferForm, setShowTransferForm] = useState(false);

  // Estilos dinâmicos
  const editorInputStyle = `w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
  const editorLabelStyle = `block text-xs mb-1.5 uppercase tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  useEffect(() => { if (!playerGroup && playerInfo.name && !playerInfo.playerId) { setPlayerInfo(prev => ({ ...prev, playerId: playerInfo.name.toLowerCase().replace(/\s+/g, '_') })); } }, [playerInfo.name]);
  
  const handleSaveMaster = () => { 
    if (!playerInfo.name || !playerInfo.playerId || !playerInfo.dob) { 
      alert("Nome, ID e Data de Nascimento são obrigatórios."); return; 
    } 
    // Propaga os dados mestre (nome, id, foto, dob) para todas as transações
    const finalTransactions = transactions.map(t => ({ 
      ...t, 
      name: playerInfo.name, 
      playerId: playerInfo.playerId, 
      photoUrl: playerInfo.photoUrl,
      dob: playerInfo.dob, // Garante que o DOB esteja em todas as transações
      position: t.position || playerInfo.defaultPosition 
    })); 
    onSave(playerInfo.playerId, playerGroup?.playerId, finalTransactions); 
  };
  
  const handleSaveTransfer = (transferData) => { 
    if (editingTransfer) { 
      setTransactions(prev => prev.map(t => t.id === transferData.id ? transferData : t)); 
    } else { 
      // Não precisa adicionar 'age' aqui, 'dob' já vem do playerInfo
      setTransactions(prev => [...prev, { ...transferData, position: transferData.position || playerInfo.defaultPosition }]); 
    } 
    setShowTransferForm(false); 
    setEditingTransfer(null); 
  };
  
  const handleDeleteTransfer = (id) => { if (window.confirm('Remover esta movimentação?')) { setTransactions(prev => prev.filter(t => t.id !== id)); } };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto ${isDark ? 'bg-black/90' : 'bg-gray-500/50'}`}>
      <div className={`rounded-3xl border w-full max-w-4xl my-8 shadow-2xl flex flex-col max-h-[95vh] ${isDark ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className={`p-6 border-b flex justify-between items-center rounded-t-3xl ${isDark ? 'border-gray-800 bg-[#161616]' : 'border-gray-200 bg-gray-50'}`}>
          <div><h2 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{playerGroup ? <Edit className="w-6 h-6 text-blue-500"/> : <Plus className="w-6 h-6 text-green-500"/>} {playerGroup ? `Editando: ${playerInfo.name}` : 'Novo Jogador'}</h2></div>
          <button onClick={onCancel} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}><X className="w-5 h-5"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          <section className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-500"><User className="w-5 h-5"/> Informações do Atleta</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1 flex flex-col items-center justify-center">
                <img src={playerInfo.photoUrl} alt="Preview" className={`w-24 h-24 rounded-full border-4 mb-3 object-cover ${isDark ? 'border-gray-800 bg-black' : 'border-gray-200 bg-gray-100'}`} onError={(e) => e.target.src='https://placehold.co/100x100/2d3748/ffffff?text=Foto'}/>
                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Preview da Foto</span>
              </div>
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={editorLabelStyle}>Nome Completo</label><input type="text" value={playerInfo.name} onChange={e => setPlayerInfo({...playerInfo, name: e.target.value})} className={editorInputStyle} required placeholder="Ex: Jefferson Savarino"/></div>
                <div><label className={`${editorLabelStyle} flex items-center gap-1 text-blue-500`}><Fingerprint className="w-3 h-3"/> ID Único (Agrupador)</label><input type="text" value={playerInfo.playerId} onChange={e => setPlayerInfo({...playerInfo, playerId: e.target.value})} className={`${editorInputStyle} ${isDark ? 'border-blue-900/50 bg-blue-950/20' : 'border-blue-200 bg-blue-50'}`} required/></div>
                {/* NOVO: Data de Nascimento */}
                <div><label className={`${editorLabelStyle} text-green-500`}><Calendar className="w-3 h-3 inline-block mr-1"/> Data de Nascimento</label><input type="date" value={playerInfo.dob} onChange={e => setPlayerInfo({...playerInfo, dob: e.target.value})} className={`${editorInputStyle} ${isDark ? 'border-green-900/50 bg-green-950/20' : 'border-green-200 bg-green-50'}`} required/></div>
                
                <div><label className={editorLabelStyle}>Posição Padrão</label><select value={playerInfo.defaultPosition} onChange={e => setPlayerInfo({...playerInfo, defaultPosition: e.target.value})} className={editorInputStyle}>{POSITION_ORDER.map(pos => <option key={pos} value={pos}>{pos}</option>)}</select></div>
                <div className="md:col-span-2"><label className={editorLabelStyle}>URL da Foto</label><input type="text" value={playerInfo.photoUrl} onChange={e => setPlayerInfo({...playerInfo, photoUrl: e.target.value})} className={editorInputStyle} placeholder="https://..."/></div>
              </div>
            </div>
          </section>
          <section className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold flex items-center gap-2 text-green-500"><Activity className="w-5 h-5"/> Histórico de Movimentações</h3><button onClick={() => { setEditingTransfer(null); setShowTransferForm(true); }} className={`py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${isDark ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}><Plus className="w-4 h-4"/> Adicionar</button></div>
            {transactions.length === 0 ? (<div className={`text-center py-8 border-2 border-dashed rounded-xl ${isDark ? 'text-gray-500 border-gray-800' : 'text-gray-400 border-gray-300'}`}>Nenhuma movimentação registrada.</div>) : (<div className={`overflow-hidden rounded-xl border ${isDark ? 'border-gray-800' : 'border-gray-200'}`}><table className="w-full text-left text-sm"><thead className={isDark ? 'bg-black/40 text-gray-400' : 'bg-gray-100 text-gray-600'}><tr><th className="p-3">Ano</th><th className="p-3">Tipo</th><th className="p-3">Clube</th><th className="p-3 text-right">Valor Final (€)</th><th className="p-3 text-right">Ações</th></tr></thead><tbody className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-200'}`}>{transactions.sort((a,b) => b.year - a.year).map(t => (<tr key={t.id} className={`transition-colors ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}><td className={`p-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.year}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getTypeProps(t.type).color}`}>{getTypeProps(t.type).label}</span></td><td className={`p-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.club}</td><td className={`p-3 text-right ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(t.value, false)}</td><td className="p-3 text-right flex justify-end gap-2"><button onClick={() => { setEditingTransfer(t); setShowTransferForm(true); }} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-100 text-blue-600'}`}><Edit className="w-4 h-4"/></button><button onClick={() => handleDeleteTransfer(t.id)} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table></div>)}
          </section>
        </div>
        <div className={`p-6 border-t rounded-b-3xl flex justify-end gap-4 ${isDark ? 'border-gray-800 bg-[#161616]' : 'border-gray-200 bg-gray-50'}`}><button onClick={onCancel} className={`px-6 py-3 rounded-xl border font-semibold transition-colors ${isDark ? 'border-gray-700 hover:bg-gray-800 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}>Cancelar</button><button onClick={handleSaveMaster} className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><Save className="w-5 h-5"/> Salvar Tudo</button></div>
      </div>
      {showTransferForm && <TransferSubForm transfer={editingTransfer} onSave={handleSaveTransfer} onCancel={() => setShowTransferForm(false)} />}
    </div>
  );
};

// --- COMPONENTE: Data Management ---
const DataManagement = ({ transfers, onUpdate, onBack }) => {
  const { isDark } = useTheme();
  const [editingGroup, setEditingGroup] = useState(null);
  const [showMasterForm, setShowMasterForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estilos dinâmicos
  const searchInputStyle = `w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isDark ? 'bg-gray-900/50 border-gray-800 text-white placeholder-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`;

  const uniquePlayers = useMemo(() => { const groups = {}; transfers.forEach(t => { if (!groups[t.playerId]) { groups[t.playerId] = { playerId: t.playerId, name: t.name, photoUrl: t.photoUrl, dob: t.dob, transactions: [] }; } groups[t.playerId].transactions.push(t); }); return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name)); }, [transfers]);
  const filteredPlayers = useMemo(() => { return uniquePlayers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.playerId.toLowerCase().includes(searchTerm.toLowerCase())); }, [uniquePlayers, searchTerm]);
  const handleSaveMaster = useCallback((newId, oldId, newTrans) => { let updated = [...transfers]; if (oldId) { updated = updated.filter(t => t.playerId !== oldId); } updated = [...updated, ...newTrans]; onUpdate(updated); setShowMasterForm(false); setEditingGroup(null); }, [transfers, onUpdate]);
  const handleDeletePlayer = useCallback((pid) => { if (window.confirm('Excluir jogador e histórico?')) { onUpdate(transfers.filter(t => t.playerId !== pid)); } }, [transfers, onUpdate]);
  const handleDeleteAll = useCallback(() => { if (window.confirm('ATENÇÃO: Apagar TODOS os registros?')) { if (window.confirm('Confirmação final: Limpar TUDO?')) { onUpdate([]); } } }, [onUpdate]);
  
  // ATUALIZADO: Export/Import com campos de salário
  const handleExport = useCallback(() => { 
    const headers = [
      'id', 'playerId', 'name', 'position', 'type', 'club', 'year', 'dob', 
      'value', 'marketValue', 'photoUrl', 'currency', 'originalValue', 'exchangeRate', 'isFixedRate', 
      'paymentMethod', 'installments', 'installmentsDetails', 
      'playerBonus', 'playerBonusDate', 'agentBonus', 'agentBonusDate', 
      'intermediaries', 'triggers', 'contractStartDate', 'contractEndDate', 
      'is100percent', 'safPercentage', 'otherOwners',
      // CAMPOS ADICIONADOS
      'salaryCLT', 'salaryImage', 'hasProgressiveRaise', 'progressiveRaises',
      // CAMPO DE VENCIMENTO ANTECIPADO ADICIONADO
      'hasAccelerationClause'
    ]; 
    const csvString = [headers.join(','), ...transfers.map(t => headers.map(h => { const val = t[h]; if (Array.isArray(val) || typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`; return JSON.stringify(val || ''); }).join(','))].join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csvString], { type: 'text/csv;charset=utf-8;' })); link.setAttribute('download', `botafogo_db_full_${new Date().toISOString().slice(0,10)}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); 
  }, [transfers]);
  
  const handleImport = useCallback((e) => { 
    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); 
    reader.onload = (evt) => { 
      try { 
        const text = evt.target.result; 
        const lines = text.split('\n').filter(l => l.trim()); 
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim()); 
        const newTransfers = []; 
        for (let i = 1; i < lines.length; i++) { 
          const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g); 
          if (values && values.length >= headers.length) { 
            const entry = {}; 
            headers.forEach((header, index) => { 
              let val = values[index] ? values[index].replace(/^"|"$/g, '').replace(/""/g, '"') : ''; 
              // CAMPOS DE JSON ATUALIZADOS
              if (['intermediaries', 'triggers', 'installmentsDetails', 'otherOwners', 'progressiveRaises'].includes(header)) { 
                try { entry[header] = JSON.parse(val); } catch { entry[header] = []; } 
              } 
              // CAMPOS NUMÉRICOS ATUALIZADOS
              else if (['value', 'marketValue', 'year', 'id', 'originalValue', 'exchangeRate', 'installments', 'playerBonus', 'agentBonus', 'safPercentage', 'salaryCLT', 'salaryImage'].includes(header)) entry[header] = Number(val) || 0; 
              // CAMPOS BOOLEANOS ATUALIZADOS
              else if (['isFixedRate', 'is100percent', 'hasProgressiveRaise', 'hasAccelerationClause'].includes(header)) entry[header] = val === 'true'; 
              else entry[header] = val; 
            }); 
            if (!entry.id) entry.id = Date.now() + i; 
            if (!entry.playerId) entry.playerId = entry.name ? entry.name.toLowerCase().replace(/\s+/g, '_') : `p_${entry.id}`; 
            newTransfers.push(entry); 
          } 
        } 
        if (window.confirm(`Importar ${newTransfers.length} registros?`)) onUpdate(newTransfers); 
      } catch (err) { alert('Erro na importação CSV.'); } 
    }; 
    reader.readAsText(file); e.target.value = ''; 
  }, [onUpdate]);

  return (
    <div className={`border rounded-3xl overflow-hidden flex flex-col h-[85vh] ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
      <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'bg-[#111] border-gray-800' : 'bg-gray-50 border-gray-200'}`}><div className="flex items-center gap-4"><button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-black hover:bg-gray-200'}`}><ArrowLeft className="w-6 h-6" /></button><h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Settings className="w-6 h-6" /> Gerenciar Jogadores</h2></div><div className="flex gap-3"><button onClick={handleDeleteAll} className={`btn-secondary flex items-center gap-2 text-sm px-3 py-2 border rounded-xl transition-colors ${isDark ? 'bg-red-950/50 text-red-400 hover:bg-red-900/50 border-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`} title="Apagar tudo"><Trash2 className="w-4 h-4"/> Limpar Tudo</button><button onClick={handleExport} className={`btn-secondary flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors ${isDark ? 'bg-gray-800 text-blue-400 hover:bg-gray-700' : 'bg-gray-100 text-blue-600 hover:bg-gray-200'}`}><Download className="w-4 h-4"/> CSV</button><label className={`btn-secondary flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors cursor-pointer ${isDark ? 'bg-gray-800 text-green-400 hover:bg-gray-700' : 'bg-gray-100 text-green-600 hover:bg-gray-200'}`}><Upload className="w-4 h-4"/> Importar <input type="file" accept=".csv" className="hidden" onChange={handleImport}/></label><button onClick={() => setShowMasterForm(true)} className={`btn-primary flex items-center gap-2 text-sm px-4 py-2 font-bold rounded-xl transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><Plus className="w-4 h-4"/> Novo</button></div></div>
      <div className={`p-4 border-b ${isDark ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-200'}`}><input type="text" placeholder="Buscar jogador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={searchInputStyle} /></div>
      <div className="flex-1 overflow-y-auto p-4"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filteredPlayers.map(group => (<div key={group.playerId} className={`border rounded-2xl p-4 transition-all group relative ${isDark ? 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/70' : 'bg-white border-gray-200 hover:shadow-md'}`}><div className="flex items-center gap-4"><img src={group.photoUrl} className={`w-14 h-14 rounded-full border-2 object-cover ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-100'}`} onError={(e) => e.target.src='https://placehold.co/100x100/2d3748/ffffff?text=?'}/><div><h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{group.name}</h3><p className={`text-xs font-mono mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{group.playerId}</p><p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{group.transactions.length} mov. ({formatDate(group.dob)})</p></div></div><div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditingGroup(group); setShowMasterForm(true); }} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white'}`}><Edit className="w-4 h-4"/></button><button onClick={() => handleDeletePlayer(group.playerId)} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div>
      {showMasterForm && <MasterPlayerEditor playerGroup={editingGroup} existingPlayers={uniquePlayers} onSave={handleSaveMaster} onCancel={() => { setShowMasterForm(false); setEditingGroup(null); }} />}
    </div>
  );
};

// --- COMPONENTE: Página de Detalhes do Jogador ---
const PlayerDetailView = ({ player, allTransactions, onBack }) => {
  const { isDark } = useTheme();
  // ATUALIZADO: Sort mais robusto (Ano, depois Data de Início)
  const playerHistory = allTransactions
    .filter(t => t.playerId === player.playerId)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      // Usa data de início para desempate
      return new Date(b.contractStartDate || 0) - new Date(a.contractStartDate || 0); 
    });
  
  const dob = playerHistory[0]?.dob; 
  
  // NOVO: Lógica de Status Atual do Elenco (para o Header)
  const [currentSquadStatus, mostRecentTransaction] = useMemo(() => {
    if (playerHistory.length === 0) {
      return [{ label: 'Sem Vínculo', color: 'text-gray-500', icon: ShieldOff }, null];
    }
    
    const mostRecent = playerHistory[0];
    const today = new Date();
    const endDate = mostRecent.contractEndDate ? new Date(mostRecent.contractEndDate + 'T00:00:00') : null;
    const isContractVigente = endDate && endDate >= today;

    if (isContractVigente) {
      if (mostRecent.type === 'loan_out') {
        // Jogador está emprestado para outro clube
        return [{ label: 'Emprestado', color: 'text-orange-500', icon: Users }, mostRecent]; 
      }
      if (['buy', 'loan_in', 'free'].includes(mostRecent.type)) {
        // Assumindo "Elenco Principal" como padrão. "Base" não está nos dados.
        return [{ label: 'Elenco Principal', color: 'text-green-500', icon: Shield }, mostRecent]; 
      }
    }
    
    // Se não está vigente, ou é 'sale'
    return [{ label: 'Sem Vínculo', color: 'text-gray-500', icon: ShieldOff }, mostRecent];
  }, [playerHistory]);
  
  const overdueItems = useMemo(() => {
    const items = [];
    playerHistory.forEach(t => {
      // (Lógica de atrasos mantida...)
      if (isOverdue(t.playerBonusDate) && t.playerBonus > 0) items.push({ type: 'Luvas Jogador', value: t.playerBonus, date: t.playerBonusDate, year: t.year });
      if (isOverdue(t.agentBonusDate) && t.agentBonus > 0) items.push({ type: 'Luvas Intermed.', value: t.agentBonus, date: t.agentBonusDate, year: t.year });
      // ATUALIZADO: Lógica de gatilho atrasado removida, pois o 'prazo' (date) foi removido
      // t.triggers?.forEach(trig => { if (trig.status === 'hit' && !trig.isPaid && isOverdue(trig.date)) items.push({ type: `Gatilho: ${trig.description}`, value: trig.value, date: trig.date, year: t.year }); });
      t.installmentsDetails?.forEach(inst => { if (inst.status === 'pending' && isOverdue(inst.date)) items.push({ type: `Parcela ${inst.number}/${t.installments}`, value: inst.value, date: inst.date, year: t.year }); });
    });
    return items;
  }, [playerHistory]);

  return (
    <div className={`border rounded-3xl p-6 md:p-8 animate-fadeIn space-y-8 ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
      {overdueItems.length > 0 && (<div className={`border-l-4 rounded-r-xl p-4 animate-pulse-slow ${isDark ? 'bg-red-950/40 border-red-500' : 'bg-red-50 border-red-500'}`}><div className="flex items-center gap-2 text-red-500 font-bold mb-2"><AlertTriangle className="w-5 h-5"/> ATENÇÃO: Pagamentos em Atraso Detectados</div><ul className="space-y-1">{overdueItems.map((item, idx) => (<li key={idx} className={`text-sm flex justify-between ${isDark ? 'text-red-300' : 'text-red-700'}`}><span>• {item.type} ({item.year}) - Venceu em {formatDate(item.date)}</span><span className="font-bold">{formatCurrency(item.value, false)}</span></li>))}</ul></div>)}
      <div className="flex items-center"><button onClick={onBack} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors mr-4 ${isDark ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}><ArrowLeft className="w-5 h-5" /><span className="font-semibold">Voltar</span></button><img src={player.photoUrl} onError={(e) => { e.target.src = 'https://placehold.co/100x100/2d3748/ffffff?text=Foto'; }} className={`w-20 h-20 rounded-full border-4 shadow-lg object-cover ${isDark ? 'border-gray-800 bg-black' : 'border-white bg-gray-100'}`} /><div className="ml-6"><h2 className={`text-4xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.name}</h2><div className={`flex items-center gap-3 text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <span className={`font-semibold px-3 py-1 rounded-lg ${isDark ? 'text-white bg-gray-800' : 'text-gray-900 bg-gray-100'}`}>{player.position}</span>
        
        {/* NOVO: Status do Elenco */}
        {currentSquadStatus && (
          <>
            <span>•</span>
            <span className={`font-semibold px-3 py-1 rounded-lg text-sm flex items-center gap-1.5 ${currentSquadStatus.color} ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <currentSquadStatus.icon className="w-4 h-4" />
              {currentSquadStatus.label}
            </span>
          </>
        )}

        <span>•</span>
        <span>Nasc: <span className="font-semibold">{formatDate(dob)}</span></span>
        <span>•</span>
        <span>ID: <span className="font-mono text-sm">{player.playerId}</span></span>
        </div></div></div>
      <div><h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><FileText className="w-6 h-6 text-blue-500"/> Detalhes Contratuais por Temporada</h3><div className="space-y-6">{playerHistory.map(trans => { const typeProps = getTypeProps(trans.type); const ageAtTransfer = calculateAge(dob, trans.year); return (<div key={trans.id} className={`border rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}><div className={`px-6 py-4 flex justify-between items-center ${isDark ? 'bg-gray-800/60' : 'bg-gray-50'}`}><div className="flex items-center gap-4"><span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{trans.year}</span><span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${typeProps.color}`}>{typeProps.label}</span><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Clube: <strong className={isDark ? 'text-white' : 'text-gray-900'}>{trans.club}</strong></span><span className={`px-2 py-0.5 rounded text-sm font-semibold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>({ageAtTransfer} anos)</span></div><div className="text-right"><div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(trans.value)}</div>{trans.originalValue > 0 && trans.currency !== 'EUR' && (<div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({trans.currency} {formatCurrency(trans.originalValue, false).replace('€', '')})</div>)}</div></div>
      {/* INFO CONTRATO - ATUALIZADO */}
      {(trans.contractStartDate || trans.contractEndDate || trans.type) && (
          <div className={`px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm border-b ${isDark ? 'bg-blue-900/10 text-blue-300 border-gray-800' : 'bg-blue-50 text-blue-700 border-gray-100'}`}>
            
            {/* NOVO: Lógica de Status (Vigente/Encerrado) e Tipo (Definitivo/Empréstimo) */}
            {(() => {
              const today = new Date();
              const endDate = trans.contractEndDate ? new Date(trans.contractEndDate + 'T00:00:00') : null;
              
              // 1. Tipo de Contrato
              const contractTypeLabel = (trans.type === 'loan_in' || trans.type === 'loan_out') ? 'Empréstimo' : 'Definitivo';
              
              // 2. Status do Contrato
              let contractStatus = { label: 'Indefinido', color: 'text-gray-500' };
              if (trans.type === 'sale') { 
                contractStatus = { label: 'Vendido', color: 'text-red-500' }; 
              } else if (trans.type === 'loan_out') {
                contractStatus = { label: 'Emprestado (Saída)', color: 'text-orange-500' };
              } else if (endDate && endDate < today) { 
                contractStatus = { label: 'Contrato Encerrado', color: 'text-gray-500' }; 
              } else if (endDate && endDate >= today) { 
                contractStatus = { label: 'Contrato Vigente', color: 'text-green-500' }; 
              }

              return (
                <>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4"/> Status: <span className={`font-semibold ${contractStatus.color}`}>{contractStatus.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4"/> Tipo: <span className="font-semibold">{contractTypeLabel}</span>
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4"/> Vígencia: <span className="font-semibold">{formatDate(trans.contractStartDate)} até {formatDate(trans.contractEndDate)}</span>
            </div>
            
            {/* CAMPOS DE SALÁRIO MOVIDOS PARA CÁ */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4"/> Salário CLT: <span className="font-semibold">{formatCurrency(trans.salaryCLT || 0, false)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4"/> Salário Imagem: <span className="font-semibold">{formatCurrency(trans.salaryImage || 0, false)}</span>
            </div>
          </div>
        )}
      {/* NOVO: INFO PROPRIEDADE */}
      {(!trans.is100percent && trans.otherOwners?.length > 0) && (<div className={`px-6 py-3 border-b ${isDark ? 'bg-purple-900/10 border-gray-800' : 'bg-purple-50 border-gray-100'}`}><h4 className={`text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}><PieChart className="w-4 h-4"/> Divisão de Propriedade</h4><div className="flex gap-4 text-sm"><span className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>SAF: {trans.safPercentage}%</span>{trans.otherOwners.map((o, i) => (<span key={i} className={isDark ? 'text-gray-400' : 'text-gray-600'}>{o.name}: {o.percentage}%</span>))}</div></div>)}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="space-y-6"><div><h4 className={`text-sm font-bold uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'}`}><DollarSign className="w-4 h-4"/> Condições de Pagamento</h4>
        {/* ATUALIZADO: Grid para 2 colunas */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500 block">Forma:</span> <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{trans.paymentMethod || '-'}</span></div>
          <div><span className="text-gray-500 block">Parcelas:</span> <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{trans.installments || 1}x</span></div>
          
          {/* CAMPOS DE SALÁRIO REMOVIDOS DESTA SEÇÃO */}

          <div><span className="text-gray-500 block">Luvas Jogador:</span> <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(trans.playerBonus || 0, false)}</span> <span className={`text-xs ${isOverdue(trans.playerBonusDate) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>({formatDate(trans.playerBonusDate)})</span></div>
          <div><span className="text-gray-500 block">Luvas Intermed.:</span> <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(trans.agentBonus || 0, false)}</span> <span className={`text-xs ${isOverdue(trans.agentBonusDate) ? 'text-red-500 font-bold' : 'text-gray-500'}`}>({formatDate(trans.agentBonusDate)})</span></div>
        </div>
        
        {trans.intermediaries?.length > 0 && (<div className="mt-4"><span className="text-gray-500 block text-sm mb-1">Intermediários Envolvidos:</span><ul className={`rounded-lg p-2 space-y-1 ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>{trans.intermediaries.map((agent, i) => (<li key={i} className="text-sm flex justify-between"><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{agent.name}</span><span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(agent.value || 0, false)}</span></li>))}</ul></div>)}
        
        {/* LISTA DE AUMENTOS SALARIAIS ADICIONADA */}
        {trans.hasProgressiveRaise && trans.progressiveRaises?.length > 0 && (
          <div className="mt-4">
            <span className="text-gray-500 block text-sm mb-1">Aumentos Salariais Programados:</span>
            <ul className={`rounded-lg p-2 space-y-1 ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
              {trans.progressiveRaises.map((raise, i) => (
                <li key={i} className="text-sm flex justify-between items-center">
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                    Em: {formatDate(raise.date)}
                  </span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {/* Formata o valor corretamente */}
                    + {raise.unit === '%' ? `${raise.value}%` : `${CURRENCIES[raise.unit]?.symbol || raise.unit} ${Number(raise.value).toLocaleString('pt-BR')}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
      {/* CRONOGRAMA DE PARCELAS */}
      {trans.installmentsDetails?.length > 0 && (<div><h4 className={`text-sm font-bold uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'}`}><CheckSquare className="w-4 h-4"/> Cronograma de Pagamentos</h4><div className="space-y-2">{trans.installmentsDetails.map((inst, i) => { 
                // Lógica de status atualizada
                const status = getInstallmentStatusProps(inst);
                const StatusIcon = status.icon;
                
                return (
                  <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-sm ${isDark ? 'bg-black/20' : 'bg-gray-100'} ${status.label === 'Atrasado' ? 'border border-red-500/50' : (status.label === 'Vence em breve' ? 'border border-orange-500/50' : '')}`}>
                    
                    <div className="flex items-center gap-3">
                      {/* Ícone de Status (substitui a bolinha) */}
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Parcela {inst.number}/{trans.installments}</span>
                    </div>
                    
                    <div className="text-right">
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(inst.value, false)}</div>
                      {/* Label de Status e Data */}
                      <div className={`text-xs flex items-center justify-end gap-1 ${status.color} ${status.label === 'Atrasado' ? 'font-bold' : ''}`}>
                        <span>{status.label}</span>
                        {/* Não mostra a data se já estiver pago */}
                        {status.label !== 'Pago' && <span>({formatDate(inst.date)})</span>}
                      </div>
                    </div>
                  </div>
                ); 
              })}</div></div>)}</div><div className="space-y-4"><h4 className={`text-sm font-bold uppercase tracking-wider border-b pb-2 mb-3 flex items-center gap-2 ${isDark ? 'text-gray-400 border-gray-800' : 'text-gray-500 border-gray-200'}`}><Target className="w-4 h-4"/> Gatilhos & Bônus</h4>{trans.triggers?.length > 0 ? (<ul className="space-y-2">{trans.triggers.map((trig, i) => { 
        
        // ATUALIZADO: Adicionado fallback caso o status 'pending' ainda exista em dados antigos
        const status = TRIGGER_STATUS[trig.status] || { label: 'Pendente', color: 'text-yellow-500', icon: Clock }; 
        const Icon = status.icon; 
        // const overdue = (trig.status === 'hit' && !trig.isPaid && isOverdue(trig.date)); // REMOVIDO
        
        // Lógica para status de pagamento
        const paymentStatus = trig.isPaid ? 
            { label: 'Pago', color: 'text-blue-500', icon: CheckCircle } :
            (trig.status === 'hit' ? 
                { label: 'Pgto. Pendente', color: 'text-yellow-500', icon: Clock } :
                { label: 'N/A', color: 'text-gray-500', icon: X }
            );
        
        // NOVO: Lógica para formatar valor do gatilho com moeda correta
        const triggerValue = trig.value || 0;
        const triggerCurrency = trig.currency || 'EUR';
        const formattedValue = formatCurrency(triggerValue, false); // Retorna "€1.000.000" ou "Livre"
        let triggerValueDisplay;
        if (formattedValue === 'Livre') {
          triggerValueDisplay = 'Livre';
        } else if (triggerCurrency === 'EUR') {
          triggerValueDisplay = formattedValue;
        } else {
          // Substitui o símbolo € pelo símbolo correto
          triggerValueDisplay = formattedValue.replace('€', CURRENCIES[triggerCurrency]?.symbol || triggerCurrency);
        }

        return (<li key={i} className={`rounded-lg p-3 flex items-center justify-between ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}> {/* overdue class removido */}
          <div className="flex-1">
            <div className={`font-medium flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{trig.description}</div>
            
            {/* NOVO: Mostrar data de pagamento se houver */}
            {trig.paymentDate && (
              <div className="text-xs text-blue-400">
                Pago em: {formatDate(trig.paymentDate)}
              </div>
            )}
          </div>
        
        <div className="text-right">
          {/* ATUALIZADO: Exibe o valor com a moeda correta */}
          <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{triggerValueDisplay}</div>
          {/* Status da Performance */}
          <div className={`text-xs flex items-center gap-1 justify-end ${status.color}`}>
            <Icon className="w-3 h-3"/> {status.label}
          </div>
          {/* Status do Pagamento */}
          <div className={`text-xs flex items-center gap-1 justify-end ${paymentStatus.color}`}>
            <paymentStatus.icon className="w-3 h-3"/> {paymentStatus.label}
          </div>
        </div>
        </li>); 
      })}</ul>) : (<div className="text-gray-500 text-sm italic py-2">Nenhum gatilho registrado.</div>)}</div></div></div>); })}</div></div></div>
  );
};

// --- COMPONENTE PRINCIPAL: App (Contém o Provider de Tema) ---
const AppContent = () => {
  const { isDark, toggleTheme } = useTheme();
  const [transfers, setTransfers] = useState(initialTransfersData);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [viewMode, setViewMode] = useState('kpis');
  const [previousViewMode, setPreviousViewMode] = useState('kpis');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'year', direction: 'descending' });
  const [clubSortConfig, setClubSortConfig] = useState({ key: 'balance', direction: 'ascending' });

  // Estilos Dinâmicos Principais
  const mainBg = isDark ? 'bg-[#0a0a0a]' : 'bg-gray-100';
  const headerBg = isDark ? 'bg-[#111111]/80 border-white/5' : 'bg-white/80 border-gray-200';
  const titleColor = isDark ? 'text-white' : 'text-gray-900';
  const selectStyle = `border text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer transition-colors ${isDark ? 'bg-gray-900 border-gray-700 hover:border-gray-600 text-white' : 'bg-white border-gray-300 hover:border-gray-400 text-gray-900'}`;

  const handleDataUpdate = useCallback((newData) => { setTransfers(newData); }, []);
  const uniqueYears = useMemo(() => [...new Set(transfers.map(t => t.year))].sort((a, b) => b - a), [transfers]);
  const uniquePositions = useMemo(() => [...new Set(transfers.map(t => t.position))].sort(), [transfers]);
  const filteredData = useMemo(() => { return transfers.filter(t => { const yearMatch = selectedYear === 'all' || t.year === selectedYear; const typeMatch = selectedType === 'all' || t.type === selectedType; const posMatch = selectedPosition === 'all' || t.position === selectedPosition; return yearMatch && typeMatch && posMatch; }); }, [transfers, selectedYear, selectedType, selectedPosition]);
  
  // Atualizado: Cálculo da Idade Média
  const kpis = useMemo(() => { 
    const data = selectedYear === 'all' ? transfers : transfers.filter(t => t.year === selectedYear); 
    const sales = data.filter(t => t.type === 'sale'); 
    const buys = data.filter(t => t.type === 'buy'); 
    const totalSales = sales.reduce((sum, t) => sum + t.value, 0); 
    const totalBuys = buys.reduce((sum, t) => sum + t.value, 0); 
    
    // Usa 'filteredData' se houver filtro, senão usa 'data' (baseada no ano)
    const avgAgeData = filteredData.length > 0 ? filteredData : data; 
    const ages = avgAgeData.map(t => calculateAge(t.dob, t.year)).filter(age => typeof age === 'number' && age > 0);
    const avgAge = ages.length > 0 ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : 0;

    return { 
      totalSales, totalBuys, balance: totalSales - totalBuys, 
      salesCount: sales.length, buysCount: buys.length, 
      avgAge: avgAge, 
      topSales: data.filter(t => t.type === 'sale' && t.value > 0).sort((a, b) => b.value - a.value).slice(0, 5), 
      topBuys: data.filter(t => t.type === 'buy' && t.value > 0).sort((a, b) => b.value - a.value).slice(0, 5) 
    }; 
  }, [transfers, selectedYear, filteredData]); 

  const sortedData = useMemo(() => { 
    let sortableData = [...filteredData]; 
    if (sortConfig.key) { 
      sortableData.sort((a, b) => { 
        let aVal, bVal;
        // NOVO: Ordenar por idade calculada
        if (sortConfig.key === 'age') {
          aVal = calculateAge(a.dob, a.year);
          bVal = calculateAge(b.dob, b.year);
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase(); 
        if (typeof bVal === 'string') bVal = bVal.toLowerCase(); 
        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1; 
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1; 
        return 0; 
      }); 
    } 
    return sortableData; 
  }, [filteredData, sortConfig]);
  
  const requestSort = useCallback((key) => { setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'descending' ? 'ascending' : 'descending' })); }, []);
  const requestClubSort = useCallback((key) => { setClubSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' })); }, []);
  
  const clubData = useMemo(() => { const clubs = {}; transfers.forEach(t => { if (!t.club || t.club === 'Sem clube') return; if (!clubs[t.club]) { clubs[t.club] = { buys: 0, sales: 0, balance: 0, transactions: 0 }; } if (t.type === 'buy') clubs[t.club].buys += t.value; else if (t.type === 'sale') clubs[t.club].sales += t.value; clubs[t.club].transactions++; }); let processed = Object.entries(clubs).map(([name, data]) => ({ name, ...data, balance: data.sales - data.buys })); if (clubSortConfig.key) { processed.sort((a, b) => { let aVal = a[clubSortConfig.key]; let bVal = b[clubSortConfig.key]; if (typeof aVal === 'string') aVal = aVal.toLowerCase(); if (typeof bVal === 'string') bVal = bVal.toLowerCase(); if (aVal < bVal) return clubSortConfig.direction === 'ascending' ? -1 : 1; if (aVal > bVal) return clubSortConfig.direction === 'ascending' ? 1 : -1; return 0; }); } return processed; }, [transfers, clubSortConfig]); 
  
  const handlePlayerClick = useCallback((player) => { setPreviousViewMode(viewMode); setSelectedPlayer(player); setViewMode('playerDetail'); }, [viewMode]);
  const handleBackClick = useCallback(() => { setViewMode(previousViewMode); setSelectedPlayer(null); }, [previousViewMode]);
  const handleManageClick = useCallback(() => { if (viewMode !== 'manage') { setPreviousViewMode(viewMode); setViewMode('manage'); } }, [viewMode]);
  const goHome = useCallback(() => { setViewMode('kpis'); setSelectedPlayer(null); }, []); 

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'manage': return <DataManagement transfers={transfers} onUpdate={handleDataUpdate} onBack={handleBackClick} />;
      case 'playerDetail': return <PlayerDetailView player={selectedPlayer} allTransactions={transfers} onBack={handleBackClick} />;
      case 'kpis': return (<div className="space-y-6 animate-fadeIn"><div className={`border rounded-3xl p-6 md:p-8 ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}><h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Balanço Financeiro por Temporada</h2><div className="space-y-6">{uniqueYears.map(year => { const yearData = transfers.filter(t => t.year === year); const sales = yearData.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.value, 0); const buys = yearData.filter(t => t.type === 'buy').reduce((sum, t) => sum + t.value, 0); const balance = sales - buys; const maxVal = Math.max(...transfers.map(t => t.value), 40000000); return (<div key={year} className="space-y-2"><div className="flex justify-between text-sm mb-1"><span className={`font-bold w-16 ${isDark ? 'text-white' : 'text-gray-900'}`}>{year}</span><div className="flex gap-4"><span className="text-green-500">+{formatCurrency(sales)}</span><span className="text-red-500">-{formatCurrency(buys)}</span><span className={`font-bold ${balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>{balance >= 0 ? '+' : ''}{formatCurrency(balance)}</span></div></div><div className={`h-6 rounded-full overflow-hidden flex relative ${isDark ? 'bg-gray-800/50' : 'bg-gray-200'}`}><div className={`absolute left-1/2 top-0 bottom-0 w-0.5 z-10 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}></div><div className="w-1/2 flex justify-start h-full absolute left-1/2"><div className="h-full bg-gradient-to-r from-green-500/80 to-green-400/80 transition-all duration-500 rounded-r-full" style={{ width: `${Math.min((sales/maxVal)*100, 100)}%` }}></div></div><div className="w-1/2 flex justify-end h-full absolute right-1/2"><div className="h-full bg-gradient-to-l from-red-500/80 to-red-400/80 transition-all duration-500 rounded-l-full" style={{ width: `${Math.min((buys/maxVal)*100, 100)}%` }}></div></div></div></div>); })}</div></div><div className="grid md:grid-cols-2 gap-6"><div className={`border rounded-3xl p-6 ${isDark ? 'bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-800/30' : 'bg-white border-green-100 shadow-sm'}`}><h3 className="text-xl font-bold mb-4 text-green-500 flex items-center gap-2"><TrendingUp className="w-5 h-5"/> Maiores Vendas ({selectedYear === 'all' ? 'Geral' : selectedYear})</h3><div className="space-y-3">{kpis.topSales.length > 0 ? kpis.topSales.map((player, idx) => (<div key={player.id} className={`flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-colors ${isDark ? 'bg-green-950/30 hover:bg-green-900/40' : 'bg-green-50 hover:bg-green-100'}`} onClick={() => handlePlayerClick(player)}><span className="text-lg font-bold text-green-500/50 w-6 text-center">{idx + 1}</span><img src={player.photoUrl} className={`w-10 h-10 rounded-full object-cover ${isDark ? 'bg-green-900/20' : 'bg-green-100'}`} onError={(e) => e.target.style.opacity = 0} /><div className="flex-1 min-w-0"><div className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.name}</div><div className={`text-xs truncate ${isDark ? 'text-green-300/70' : 'text-green-700/70'}`}>para {player.club} ({player.year})</div></div><div className="text-lg font-bold text-green-500">{formatCurrency(player.value, false)}</div></div>)) : <div className="text-gray-500 text-center py-4">Sem dados.</div>}</div></div><div className={`border rounded-3xl p-6 ${isDark ? 'bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-800/30' : 'bg-white border-blue-100 shadow-sm'}`}><h3 className="text-xl font-bold mb-4 text-blue-500 flex items-center gap-2"><TrendingDown className="w-5 h-5"/> Maiores Contratações ({selectedYear === 'all' ? 'Geral' : selectedYear})</h3><div className="space-y-3">{kpis.topBuys.length > 0 ? kpis.topBuys.map((player, idx) => (<div key={player.id} className={`flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-colors ${isDark ? 'bg-blue-950/30 hover:bg-blue-900/40' : 'bg-blue-50 hover:bg-blue-100'}`} onClick={() => handlePlayerClick(player)}><span className="text-lg font-bold text-blue-500/50 w-6 text-center">{idx + 1}</span><img src={player.photoUrl} className={`w-10 h-10 rounded-full object-cover ${isDark ? 'bg-blue-900/20' : 'bg-blue-100'}`} onError={(e) => e.target.style.opacity = 0} /><div className="flex-1 min-w-0"><div className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.name}</div><div className={`text-xs truncate ${isDark ? 'text-blue-300/70' : 'text-blue-700/70'}`}>de {player.club} ({player.year})</div></div><div className="text-lg font-bold text-blue-500">{formatCurrency(player.value, false)}</div></div>)) : <div className="text-gray-500 text-center py-4">Sem dados.</div>}</div></div></div></div>);
      case 'clubs': return (<div className={`border rounded-3xl overflow-hidden animate-fadeIn ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}><div className={`p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}><h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Home className="w-6 h-6 text-gray-400" /> Relacionamento com Clubes</h2></div><div className="overflow-x-auto"><table className="w-full"><thead className={isDark ? 'bg-gray-800/50' : 'bg-gray-100'}><tr><SortableTh name="name" sortConfig={clubSortConfig} onSort={requestClubSort}>Clube</SortableTh><SortableTh name="transactions" sortConfig={clubSortConfig} onSort={requestClubSort} align="center">Qtd.</SortableTh><SortableTh name="buys" sortConfig={clubSortConfig} onSort={requestClubSort} align="right">Investido (Compras)</SortableTh><SortableTh name="sales" sortConfig={clubSortConfig} onSort={requestClubSort} align="right">Recebido (Vendas)</SortableTh><SortableTh name="balance" sortConfig={clubSortConfig} onSort={requestClubSort} align="right">Saldo Final</SortableTh></tr></thead><tbody className={`divide-y ${isDark ? 'divide-gray-800/30' : 'divide-gray-200'}`}>{clubData.map((club) => (<tr key={club.name} className={`transition-colors ${isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`}><td className={`px-6 py-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{club.name}</td><td className="px-6 py-4 text-center text-gray-500">{club.transactions}</td><td className="px-6 py-4 text-right text-red-500 font-medium">{club.buys > 0 ? `-${formatCurrency(club.buys, false)}` : '-'}</td><td className="px-6 py-4 text-right text-green-500 font-medium">{club.sales > 0 ? `+${formatCurrency(club.sales, false)}` : '-'}</td><td className={`px-6 py-4 text-right font-bold ${club.balance > 0 ? 'text-green-500' : club.balance < 0 ? 'text-red-500' : 'text-gray-500'}`}>{club.balance > 0 ? '+' : ''}{formatCurrency(club.balance, false)}</td></tr>))}</tbody></table></div></div>);
      case 'table': return (<div className={`border rounded-3xl overflow-hidden animate-fadeIn ${isDark ? 'bg-gradient-to-br from-gray-900 to-gray-900/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}><div className="overflow-x-auto max-h-[70vh]"><table className="w-full relative"><thead className={`sticky top-0 z-10 backdrop-blur-sm shadow-sm ${isDark ? 'bg-gray-800/90' : 'bg-white/90'}`}><tr><SortableTh name="year" sortConfig={sortConfig} onSort={requestSort}>Ano</SortableTh><SortableTh name="name" sortConfig={sortConfig} onSort={requestSort}>Jogador</SortableTh><SortableTh name="position" sortConfig={sortConfig} onSort={requestSort} align="center">Pos.</SortableTh><SortableTh name="type" sortConfig={sortConfig} onSort={requestSort}>Tipo</SortableTh><SortableTh name="club" sortConfig={sortConfig} onSort={requestSort}>Clube</SortableTh><SortableTh name="age" sortConfig={sortConfig} onSort={requestSort} align="center">Idade</SortableTh><SortableTh name="value" sortConfig={sortConfig} onSort={requestSort} align="right">Valor</SortableTh><SortableTh name="marketValue" sortConfig={sortConfig} onSort={requestSort} align="right">V. Mercado</SortableTh></tr></thead><tbody className={`divide-y ${isDark ? 'divide-gray-800/30' : 'divide-gray-200'}`}>{sortedData.map((player) => { const ageAtTransfer = calculateAge(player.dob, player.year); return (<tr key={player.id} className={`transition-colors cursor-pointer group ${isDark ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50'}`} onClick={() => handlePlayerClick(player)}><td className="px-6 py-4 text-gray-500">{player.year}</td><td className={`px-6 py-4 font-medium transition-colors ${isDark ? 'text-white group-hover:text-blue-300' : 'text-gray-900 group-hover:text-blue-600'}`}>{player.name}</td><td className="px-6 py-4 text-center text-gray-500">{player.position}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getTypeProps(player.type).color}`}>{getTypeProps(player.type).label}</span></td><td className="px-6 py-4 text-gray-500">{player.club}</td><td className="px-6 py-4 text-center text-gray-500">{ageAtTransfer}</td><td className={`px-6 py-4 text-right font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(player.value, false)}</td><td className="px-6 py-4 text-right text-gray-500">{player.marketValue ? formatCurrency(player.marketValue, false) : '-'}</td></tr>);})}</tbody></table></div></div>);
        default: return null;
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 transition-colors duration-300 ${mainBg} ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
      <header className={`backdrop-blur-md border-b sticky top-0 z-30 transition-colors duration-300 ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Título Clicável que leva para Home */}
              <h1 onClick={goHome} className={`text-2xl md:text-3xl font-extrabold tracking-tight cursor-pointer hover:opacity-80 transition-opacity ${titleColor}`}>
                SAF Botafogo <span className="text-gray-500 font-normal">Analytics</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 self-end md:self-auto">
              <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {/* Botão Home Fixo */}
              <button onClick={goHome} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-gray-800 text-blue-400 hover:bg-gray-700' : 'bg-gray-100 text-blue-600 hover:bg-gray-200'}`} title="Ir para Início">
                 <Home className="w-5 h-5" />
              </button>

              {!['manage', 'playerDetail'].includes(viewMode) && (
                <>
                  <button onClick={handleManageClick} className={`p-2 md:px-4 md:py-2 rounded-xl transition-all flex items-center gap-2 ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black'}`} title="Gerenciar Dados"><Settings className="w-5 h-5" /><span className="hidden md:inline text-sm font-semibold">Gerenciar</span></button>
                  <nav className={`flex p-1 rounded-xl ${isDark ? 'bg-gray-800/50' : 'bg-gray-100'}`}>{[{ id: 'kpis', label: 'KPIs', icon: Activity }, { id: 'clubs', label: 'Clubes', icon: Home }, { id: 'table', label: 'Tabela', icon: FileText }].map(item => (<button key={item.id} onClick={() => setViewMode(item.id)} className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === item.id ? (isDark ? 'bg-white text-black shadow-md' : 'bg-white text-blue-600 shadow-sm') : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200')}`}><item.icon className="w-4 h-4" /><span className="hidden md:inline">{item.label}</span></button>))}</nav>
                </>
              )}
            </div>
          </div>
          {!['manage', 'playerDetail'].includes(viewMode) && (<div className={`mt-4 pt-4 border-t flex gap-3 overflow-x-auto pb-2 md:pb-0 custom-scrollbar ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))} className={selectStyle}><option value="all">📅 Todas as Temporadas</option>{uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
            {/* NOVO: Filtro de Tipos Atualizado */}
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={selectStyle}>
              <option value="all">🔄 Todos os Tipos</option>
              {Object.entries(CONTRACT_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className={selectStyle}><option value="all">⚽ Todas as Posições</option>{uniquePositions.map(p => <option key={p} value={p}>{p}</option>)}</select>
          </div>)}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!['manage', 'playerDetail'].includes(viewMode) && (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 animate-fadeIn"><KpiCard icon={TrendingUp} title="Vendas Totais" value={formatCurrency(kpis.totalSales)} footer={`${kpis.salesCount} jogadores`} colorClass={isDark ? "from-green-500/20 to-green-900/5 border-green-500/20 text-green-400" : "from-green-50 to-white border-green-200 text-green-600"} /><KpiCard icon={TrendingDown} title="Investimento Total" value={formatCurrency(kpis.totalBuys)} footer={`${kpis.buysCount} jogadores`} colorClass={isDark ? "from-red-500/20 to-red-900/5 border-red-500/20 text-red-400" : "from-red-50 to-white border-red-200 text-red-600"} /><KpiCard icon={Activity} title="Balanço Líquido" value={`${kpis.balance >= 0 ? '+' : ''}${formatCurrency(kpis.balance)}`} footer="Resultado do período" colorClass={kpis.balance >= 0 ? (isDark ? 'from-blue-500/20 to-blue-900/5 border-blue-500/20 text-blue-400' : 'from-blue-50 to-white border-blue-200 text-blue-600') : (isDark ? 'from-orange-500/20 to-orange-900/5 border-orange-500/20 text-orange-400' : 'from-orange-50 to-white border-orange-200 text-orange-600')} /><KpiCard icon={Users} title="Movimentações" value={filteredData.length} footer="Jogadores filtrados" colorClass={isDark ? "from-purple-500/20 to-purple-900/5 border-purple-500/20 text-purple-400" : "from-purple-50 to-white border-purple-200 text-purple-600"} /><KpiCard icon={Calendar} title="Média de Idade" value={kpis.avgAge} footer="Anos (no filtro)" colorClass={isDark ? "from-yellow-500/20 to-yellow-900/5 border-yellow-500/20 text-yellow-400" : "from-yellow-50 to-white border-yellow-200 text-yellow-600"} /><KpiCard icon={Target} title="Período Analisado" value={selectedYear === 'all' ? `${uniqueYears.length}` : '1'} footer={selectedYear === 'all' ? 'temporadas' : 'temporada'} colorClass={isDark ? "bg-gray-800/40 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700 shadow-sm"} /></div>)}
        {renderCurrentView()}
      </main>
    </div>
  );
};

const App = () => {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(!isDark);
  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <AppContent />
    </ThemeContext.Provider>
  );
};

export default App;
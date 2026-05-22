import { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function Intelligence() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await api.getIntelligenceAlerts();
        setAlerts(data);
      } catch (err: any) {
        showToast('Failed to load intelligence alerts', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [showToast]);

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <ShieldAlert size={24} color="#ef4444" />;
      case 'high': return <AlertTriangle size={24} color="#f59e0b" />;
      case 'medium': return <AlertCircle size={24} color="#3b82f6" />;
      case 'low':
      default: return <Info size={24} color="var(--accent-green)" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'rgba(239,68,68,0.1)';
      case 'high': return 'rgba(245,158,11,0.1)';
      case 'medium': return 'rgba(59,130,246,0.1)';
      case 'low':
      default: return 'rgba(34,197,94,0.1)';
    }
  };
  
  const getSeverityBorder = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'rgba(239,68,68,0.3)';
      case 'high': return 'rgba(245,158,11,0.3)';
      case 'medium': return 'rgba(59,130,246,0.3)';
      case 'low':
      default: return 'rgba(34,197,94,0.3)';
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: '1rem' }}>
          <ShieldAlert size={28} color="var(--accent-green)" />
        </div>
        <h2 className="text-gradient-green" style={{ fontSize: '2.5rem', marginBottom: '0.4rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
          Proactive Intelligence
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          AI-generated alerts based on live Earth Engine ward data
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 size={32} color="var(--accent-green)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No active alerts at this time. The canopy is stable.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {alerts.map((alert, idx) => (
            <div key={alert.id || idx} className="glass-panel" style={{ 
              background: getSeverityColor(alert.severity),
              border: `1px solid ${getSeverityBorder(alert.severity)}`,
              padding: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                {getSeverityIcon(alert.severity)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem' }}>
                    {alert.title}
                  </h3>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, padding: '0.25rem 0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                    {alert.ward_name}
                  </span>
                </div>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {alert.message}
                </p>
                {alert.action && (
                  <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    {alert.action} <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

import './styles.css';

export const App = () => {
  return (
    <div className="app">
      <main className="hero">
        <div className="hero__eyebrow">Let Me Out</div>
        <h1>Gestiona ausencias con claridad y foco.</h1>
        <p>
          Esta base de interfaz inicial prepara el terreno para la gestion de ausencias con
          validaciones, auditoria y flujos de aprobacion.
        </p>
        <div className="hero__actions">
          <button type="button" className="primary">
            Iniciar sesion
          </button>
          <button type="button" className="ghost">
            Ver documentacion
          </button>
        </div>
      </main>
      <section className="details">
        <div>
          <h2>Roles definidos</h2>
          <p>Empleados, validadores, auditores y admins con permisos claros.</p>
        </div>
        <div>
          <h2>Flujo trazable</h2>
          <p>Estado, historial y observaciones listos para auditar cada ausencia.</p>
        </div>
        <div>
          <h2>Notificaciones</h2>
          <p>Emails y avisos in-app para mantener a todos alineados.</p>
        </div>
      </section>
    </div>
  );
};

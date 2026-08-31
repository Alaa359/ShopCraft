import HelpModal from './HelpModal.jsx';
import TicketThreadModal from './TicketThreadModal.jsx';
import SupportAdminModal from './SupportAdminModal.jsx';

// Conteneur unique des modales du support, rendu une seule fois dans l'app.
export default function SupportModals() {
  return (
    <>
      <HelpModal />
      <SupportAdminModal />
      <TicketThreadModal />
    </>
  );
}
import { useEffect } from 'react';

export default function CustomerPortalPanel() {
  useEffect(() => {
    window.location.replace('/customer-account-overview.html');
  }, []);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p>Redirecting to Customer Account Portal...</p>
    </div>
  );
}

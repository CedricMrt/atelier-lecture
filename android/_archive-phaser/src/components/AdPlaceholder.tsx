import { useEffect, useState } from "react";

type AdPlaceholderProps = {
  onClose: () => void;
};

const CLOSE_DELAY_SECONDS = 3;

// Simule la pub avant un jeu pendant le développement, pour régler la fréquence
// et le rythme. Elle sera remplacée par le SDK publicitaire certifié « Familles »
// (pubs de test uniquement tant que l'appli n'est pas publiée).
export default function AdPlaceholder({ onClose }: AdPlaceholderProps) {
  const [remaining, setRemaining] = useState(CLOSE_DELAY_SECONDS);

  useEffect(() => {
    if (remaining <= 0) return;

    const timer = window.setTimeout(() => setRemaining((r) => r - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [remaining]);

  return (
    <div className='overlay'>
      <div className='dialog'>
        <h2>Publicité</h2>
        <div className='ad-box'>Pub de test</div>

        <div className='dialog__actions'>
          <button
            className='btn'
            type='button'
            disabled={remaining > 0}
            onClick={onClose}
          >
            {remaining > 0 ? `Fermer dans ${remaining}` : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}

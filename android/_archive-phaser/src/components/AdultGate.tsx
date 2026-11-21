import { useMemo, useState } from "react";

type AdultGateProps = {
  title: string;
  onSuccess: () => void;
  onCancel: () => void;
};

// Petite question de calcul : un enfant de 5 à 8 ans ne la résout pas, un adulte oui.
export default function AdultGate({
  title,
  onSuccess,
  onCancel,
}: AdultGateProps) {
  const question = useMemo(() => {
    const a = 6 + Math.floor(Math.random() * 4);
    const b = 6 + Math.floor(Math.random() * 4);
    const answer = a * b;
    const options = new Set<number>([answer]);

    while (options.size < 3) {
      options.add(answer + (Math.floor(Math.random() * 9) - 4 || 5));
    }

    return {
      text: `${a} × ${b} = ?`,
      answer,
      options: [...options].sort(() => Math.random() - 0.5),
    };
  }, []);

  const [failed, setFailed] = useState(false);

  return (
    <div className='overlay'>
      <div className='dialog'>
        <h2>{title}</h2>
        <p style={{ textAlign: "center", fontWeight: 800 }}>
          Question pour les grands : {question.text}
        </p>

        <div className='dialog__actions'>
          {question.options.map((option) => (
            <button
              key={option}
              className='btn'
              type='button'
              onClick={() => {
                if (option === question.answer) {
                  onSuccess();
                } else {
                  setFailed(true);
                }
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {failed && (
          <p style={{ textAlign: "center", color: "#b42318" }}>
            Ce n’est pas la bonne réponse.
          </p>
        )}

        <div className='dialog__actions'>
          <button className='btn btn--ghost' type='button' onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";
import { createDemoSession } from "../db/sessions";
import { getStarBalance } from "../db/stars";
import "./ConfirmStudentPage.css";

type ConfirmStudent = {
  id: string;
  firstName: string;
  avatarKey: string;
  avatarVariant: string;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getAvatarSymbol(avatarKey: string): string {
  const symbols: Record<string, string> = {
    renard: "🦊",
    renarde: "🦊",
    hibou: "🦉",
    robot: "🤖",
    chat: "🐱",
    tortue: "🐢",
    lapin: "🐰",
    ours: "🐻",
    grenouille: "🐸",
    dragon: "🐲",
    pieuvre: "🐙",
  };

  return symbols[normalize(avatarKey)] ?? "✦";
}

function getVariantColor(avatarVariant: string): string {
  const colors: Record<string, string> = {
    orange: "#f3a54a",
    bleu: "#68b6eb",
    bleue: "#68b6eb",
    blue: "#68b6eb",
    violet: "#b08be2",
    violette: "#b08be2",
    purple: "#b08be2",
    marron: "#b98c65",
    brown: "#b98c65",
    vert: "#83c98b",
    verte: "#83c98b",
    green: "#83c98b",
    gris: "#b8c2c9",
    grey: "#b8c2c9",
    gray: "#b8c2c9",
    rouge: "#e98a7d",
    red: "#e98a7d",
    turquoise: "#70d0c4",
    noir: "#7c8793",
    black: "#7c8793",
    creme: "#f0dfb2",
    cream: "#f0dfb2",
    blanc: "#e8edf1",
    blanche: "#e8edf1",
    white: "#e8edf1",
    rose: "#eda6c4",
    pink: "#eda6c4",
    beige: "#d9bc94",
    jaune: "#edcf69",
    yellow: "#edcf69",
  };

  return colors[normalize(avatarVariant)] ?? "#e5c783";
}

export default function ConfirmStudentPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<ConfirmStudent | null>(null);
  const [starBalance, setStarBalance] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  const mountedRef = useRef(false);
  const creatingRef = useRef(false);
  const activeStudentIdRef = useRef(studentId);

  // Permet d'ignorer une création devenue obsolète si le profil change.
  useEffect(() => {
    activeStudentIdRef.current = studentId;
  }, [studentId]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setStudent(null);
      setStarBalance(null);
      setLoadError(null);
      setBalanceWarning(null);
      setSessionError(null);

      if (!studentId) {
        setLoadError("Aucun profil n’a été sélectionné.");
        setLoading(false);
        return;
      }

      try {
        const foundStudent = await db.students.get(studentId);

        if (!active) return;

        if (!foundStudent) {
          setLoadError("Ce profil n’existe pas sur cette tablette.");
          return;
        }

        setStudent({
          id: foundStudent.id,
          firstName: foundStudent.firstName,
          avatarKey: foundStudent.avatarKey,
          avatarVariant: foundStudent.avatarVariant,
        });

        try {
          const balance = await getStarBalance(foundStudent.id);

          if (active) {
            setStarBalance(balance);
          }
        } catch (error) {
          console.error("Lecture de la réserve d’étoiles impossible :", error);

          if (active) {
            setBalanceWarning(
              "Ta réserve d’étoiles ne peut pas être affichée pour le moment.",
            );
          }
        }
      } catch (error) {
        console.error("Chargement du profil impossible :", error);

        if (active) {
          setLoadError(
            "Impossible de charger ton profil. Réessaie dans un instant.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [studentId, reloadKey]);

  const confirm = async () => {
    if (!student || creatingRef.current) return;

    const selectedStudentId = student.id;

    creatingRef.current = true;
    setCreating(true);
    setSessionError(null);

    try {
      const sessionId = await createDemoSession(selectedStudentId);

      if (
        mountedRef.current &&
        activeStudentIdRef.current === selectedStudentId
      ) {
        navigate(`/island/${encodeURIComponent(sessionId)}`, {
          replace: true,
        });
      }
    } catch (error) {
      console.error("Création de séance impossible :", error);

      if (
        mountedRef.current &&
        activeStudentIdRef.current === selectedStudentId
      ) {
        setSessionError(
          "La séance n’a pas pu être préparée. Tu peux réessayer.",
        );
      }
    } finally {
      creatingRef.current = false;

      if (mountedRef.current) {
        setCreating(false);
      }
    }
  };

  return (
    <main className='confirm-adventure'>
      <div className='confirm-adventure__shade' />

      <header className='confirm-adventure__header'>
        <button
          type='button'
          className='confirm-adventure__back'
          onClick={() => navigate("/scan")}
          disabled={creating}
        >
          <span aria-hidden='true'>←</span>
          Accueil
        </button>

        <div>
          <p>Atelier Lecture</p>
          <h1>Ton passeport d’aventure</h1>
        </div>
      </header>

      <section
        className='confirm-adventure__panel'
        aria-busy={loading || creating}
      >
        {loading ? (
          <div className='confirm-adventure__message' role='status'>
            <span aria-hidden='true'>✦</span>
            <h2>Recherche de ton explorateur…</h2>
            <p>Ton aventure se prépare.</p>
          </div>
        ) : loadError || !student ? (
          <div className='confirm-adventure__message' role='alert'>
            <span aria-hidden='true'>🧭</span>
            <h2>Explorateur introuvable</h2>

            <p>{loadError ?? "Choisis à nouveau ton profil."}</p>

            <button
              type='button'
              className='confirm-adventure__button confirm-adventure__button--gold'
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Réessayer
            </button>

            <button
              type='button'
              className='confirm-adventure__button confirm-adventure__button--teal'
              onClick={() => navigate("/manual-login")}
            >
              Choisir mon prénom
            </button>
          </div>
        ) : (
          <>
            <div className='confirm-adventure__identity'>
              <span className='confirm-adventure__badge'>
                Explorateur des îles
              </span>

              <div
                className='confirm-adventure__portrait'
                style={{
                  backgroundColor: getVariantColor(student.avatarVariant),
                }}
                aria-hidden='true'
              >
                {getAvatarSymbol(student.avatarKey)}
              </div>

              <h2 className='confirm-adventure__name'>{student.firstName}</h2>

              <p className='confirm-adventure__avatar-label'>
                {student.avatarKey} {student.avatarVariant}
              </p>

              <div className='confirm-adventure__wallet'>
                <span className='confirm-adventure__star' aria-hidden='true'>
                  ★
                </span>

                <div>
                  <span className='confirm-adventure__wallet-label'>
                    Ma réserve d’étoiles
                  </span>

                  <span className='confirm-adventure__wallet-value'>
                    {starBalance === null
                      ? "Indisponible"
                      : `${starBalance} étoile${starBalance > 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {balanceWarning && (
                <p className='confirm-adventure__warning' role='status'>
                  {balanceWarning}
                </p>
              )}
            </div>

            <div className='confirm-adventure__welcome'>
              <span className='confirm-adventure__ornament' aria-hidden='true'>
                ✦
              </span>

              <h2>Bonjour {student.firstName} !</h2>

              <p className='confirm-adventure__question'>
                Est-ce bien ton prénom et ton avatar ?
              </p>

              <p className='confirm-adventure__description'>
                Si c’est toi, embarque pour une nouvelle aventure sur les îles !
              </p>

              {sessionError && (
                <p className='confirm-adventure__error' role='alert'>
                  {sessionError}
                </p>
              )}

              <button
                type='button'
                className='confirm-adventure__button confirm-adventure__button--gold'
                onClick={() => void confirm()}
                disabled={creating}
              >
                {creating ? "Préparation de ta séance…" : "Oui, c’est moi !"}
              </button>

              <button
                type='button'
                className='confirm-adventure__button confirm-adventure__button--teal'
                onClick={() => navigate("/manual-login")}
                disabled={creating}
              >
                Ce n’est pas moi
              </button>

              <p className='confirm-adventure__hint' role='status'>
                {creating
                  ? "Patiente un instant, ton départ se prépare."
                  : "Vérifie ton profil avant de commencer."}
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

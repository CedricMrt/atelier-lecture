import { createStudent, type StudentCard } from "../services/teacherApi";
import StudentForm from "./StudentForm";

type NewStudentFormProps = {
  onCreated: (card: StudentCard) => void;
};

export default function NewStudentForm({ onCreated }: NewStudentFormProps) {
  return (
    <StudentForm
      title='Ajouter un élève'
      submitLabel='Ajouter l’élève'
      clearOnSuccess
      onSubmit={async (input) => {
        onCreated(await createStudent(input));
      }}
    />
  );
}

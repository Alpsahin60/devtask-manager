import { Sprint } from '@/types';

interface ReviewNotesProps {
  sprint: Sprint;
}

// Review notes are write-once and only meaningful for sprints that reached
// `completed`. The Mad/Sad/Glad board lives alongside in RetroBoard; this
// component focuses on the freeform review block.
export const ReviewNotes = ({ sprint }: ReviewNotesProps) => {
  if (sprint.status !== 'completed') {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Sprint-Review
      </h2>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        {sprint.reviewNotes?.trim() ? (
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {sprint.reviewNotes}
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Keine Review-Notizen hinterlegt.
          </p>
        )}
      </div>
    </section>
  );
};

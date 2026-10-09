import type { Crop } from '@ugatan/shared';

/** Line icon for a crop: a rice stalk with grains, or a corn ear in its husk. Takes its colour from the text. */
export function CropIcon({ crop, className = 'size-6' }: { crop: Crop; className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      {crop === 'corn' ? (
        <>
          <path d='M12 2.5c3 2 4 5.5 4 9.5s-1 7-4 9.5c-3-2.5-4-5.5-4-9.5s1-7.5 4-9.5Z' />
          <path d='M12 6v12M9 10h6M9 14h6' />
          <path d='M8 21.5C4.5 20.5 3.5 17 3.5 14c2.5 1 4 3.5 4.5 7.5ZM16 21.5c3.5-1 4.5-4.5 4.5-7.5-2.5 1-4 3.5-4.5 7.5Z' />
        </>
      ) : (
        <>
          <path d='M12 22V7' />
          <path d='M12 7c-1.2-1.3-1.2-3.2 0-4.5 1.2 1.3 1.2 3.2 0 4.5Z' />
          <path d='M12 12c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5ZM12 12c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5Z' />
          <path d='M12 17.5c-3 0-4.5-2-4.5-4.5 3 0 4.5 2 4.5 4.5ZM12 17.5c3 0 4.5-2 4.5-4.5-3 0-4.5 2-4.5 4.5Z' />
        </>
      )}
    </svg>
  );
}

import { useSyncExternalStore } from 'react';
import { notify } from './ToastHost';
import {
  getDisplaySnapshot, getServerDisplaySnapshot, subscribeDisplayPreferences,
  resetDisplayPreferences, setDisplayPreferences, type DisplayPreferences,
} from '../config/displayPreferences';

const copy = {
  en: {
    title: 'Text & display', size: 'Text size', weight: 'Text weight', contrast: 'Contrast',
    sizes: ['Standard', 'Large', 'Extra large'], weights: ['Regular', 'Stronger'], contrasts: ['Automatic', 'High'],
    preview: 'Preview', previewTitle: 'Good day!', previewBody: 'This is how text will look in the app. Pick what is easiest to read.',
    reset: 'Reset to defaults', unavailable: 'Settings apply now, but cannot be saved in this browser. They may reset when you leave.',
    resetTitle: 'Display settings reset', resetNotice: 'Default display settings are now applied.',
  },
  tl: {
    title: 'Teksto at display', size: 'Laki ng teksto', weight: 'Kapal ng teksto', contrast: 'Kontrast',
    sizes: ['Karaniwan', 'Malaki', 'Mas malaki'], weights: ['Karaniwan', 'Mas makapal'], contrasts: ['Awtomatiko', 'Mataas'],
    preview: 'Halimbawa', previewTitle: 'Magandang araw po!', previewBody: 'Ganito ang itsura ng teksto sa app. Piliin ang pinakamadaling basahin.',
    reset: 'Ibalik sa karaniwan', unavailable: 'Nagagamit ang mga setting, pero hindi mai-save sa browser na ito. Maaaring mawala pag-alis mo.',
    resetTitle: 'Naibalik ang display', resetNotice: 'Nagagamit na ang mga karaniwang setting ng display.',
  },
};
type Props = { language: keyof typeof copy; id: string };
const choices = {
  textSize: ['standard', 'large', 'extra-large'],
  textWeight: ['regular', 'stronger'],
  contrast: ['automatic', 'high'],
} as const;

function ResetIcon() {
  return <svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M3 12a9 9 0 1 0 3-6.7L3 8' /><path d='M3 3v5h5' />
  </svg>;
}
function ContrastIcon({ high }: { high: boolean }) {
  return <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
    <circle cx='12' cy='12' r='8.5' />
    {high ? <circle cx='12' cy='12' r='5' fill='currentColor' stroke='none' /> : <path d='M12 3.5a8.5 8.5 0 0 1 0 17z' fill='currentColor' stroke='none' />}
  </svg>;
}

export function DisplayPreferencesPanel({ language, id }: Props) {
  const { preferences, storageAvailable } = useSyncExternalStore(subscribeDisplayPreferences, getDisplaySnapshot, getServerDisplaySnapshot);
  const text = copy[language];
  const groups = [
    { key: 'textSize', title: text.size, labels: text.sizes },
    { key: 'textWeight', title: text.weight, labels: text.weights },
    { key: 'contrast', title: text.contrast, labels: text.contrasts },
  ] as const;
  const previewId = id + '-preview';
  return <div className='display-preferences'>
    <section className='display-preview' aria-labelledby={previewId}>
      <p id={previewId} className='display-preview-label'>{text.preview}</p>
      <p className='display-preview-title'>{text.previewTitle}</p>
      <p className='display-preview-body'>{text.previewBody}</p>
    </section>
    {groups.map(({ key, title, labels }) => <fieldset key={key} className={'display-group display-group-' + key}>
      <legend>{title}</legend>
      <div className='display-options'>
        {choices[key].map((value, index) => <label key={value}>
          <input type='radio' name={id + '-' + key} value={value} checked={preferences[key] === value}
            onChange={() => setDisplayPreferences({ [key]: value } as Partial<DisplayPreferences>)} />
          {key === 'textSize' && <span className={'display-glyph display-glyph-' + index} aria-hidden='true'>Aa</span>}
          {key === 'textWeight' && <span className={'display-glyph display-glyph-weight-' + index} aria-hidden='true'>Aa</span>}
          {key === 'contrast' && <ContrastIcon high={value === 'high'} />}
          <span className='display-option-label'>{labels[index]}</span>
        </label>)}
      </div>
    </fieldset>)}
    <button type='button' className='display-reset' onClick={() => {
      resetDisplayPreferences();
      notify({ title: text.resetTitle, description: text.resetNotice, type: 'success', language });
    }}><ResetIcon />{text.reset}</button>
    {!storageAvailable && <p className='display-description' role='status'>{text.unavailable}</p>}
  </div>;
}
export function DisplayPreferencesDisclosure(props: Props) {
  return <details className='display-settings'>
    <summary>{copy[props.language].title}</summary>
    <DisplayPreferencesPanel {...props} />
  </details>;
}

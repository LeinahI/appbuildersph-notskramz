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
    reset: 'Reset to defaults', unavailable: 'Settings apply now, but cannot be saved in this browser. They may reset when you leave.',
    resetTitle: 'Display settings reset', resetNotice: 'Default display settings are now applied.',
  },
  tl: {
    title: 'Teksto at display', size: 'Laki ng teksto', weight: 'Kapal ng teksto', contrast: 'Kontrast',
    sizes: ['Karaniwan', 'Malaki', 'Mas malaki'], weights: ['Karaniwan', 'Mas makapal'], contrasts: ['Awtomatiko', 'Mataas'],
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

export function DisplayPreferencesPanel({ language, id }: Props) {
  const { preferences, storageAvailable } = useSyncExternalStore(subscribeDisplayPreferences, getDisplaySnapshot, getServerDisplaySnapshot);
  const text = copy[language];
  const groups = [
    { key: 'textSize', title: text.size, labels: text.sizes },
    { key: 'textWeight', title: text.weight, labels: text.weights },
    { key: 'contrast', title: text.contrast, labels: text.contrasts },
  ] as const;
  return <div className='display-preferences'>
    {groups.map(({ key, title, labels }) => <fieldset key={key}>
      <legend>{title}</legend>
      <div className='display-options'>
        {choices[key].map((value, index) => <label key={value}>
          <input type='radio' name={id + '-' + key} value={value} checked={preferences[key] === value}
            onChange={() => setDisplayPreferences({ [key]: value } as Partial<DisplayPreferences>)} />
          <span>{labels[index]}</span>
        </label>)}
      </div>
    </fieldset>)}
    <button type='button' className='btn btn-secondary' onClick={() => {
      resetDisplayPreferences();
      notify({ title: text.resetTitle, description: text.resetNotice, type: 'success', language });
    }}>{text.reset}</button>
    {!storageAvailable && <p className='display-description' role='status'>{text.unavailable}</p>}
  </div>;
}
export function DisplayPreferencesDisclosure(props: Props) {
  return <details className='display-settings'>
    <summary>{copy[props.language].title}</summary>
    <DisplayPreferencesPanel {...props} />
  </details>;
}

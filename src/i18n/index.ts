import { uz, en, Translations } from './translations';
import { useAppStore } from '../store/useAppStore';

export function useTranslation(): Translations {
  const language = useAppStore(s => s.language);
  return language === 'uz' ? uz : en;
}

export { uz, en };

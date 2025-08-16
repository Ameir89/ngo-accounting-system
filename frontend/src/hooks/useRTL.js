// frontend/src/hooks/useRTL.js
import { useLanguage } from '../contexts/LanguageContext';

export const useRTL = () => {
  const { isRTL, language, changeLanguage } = useLanguage();
  
  const getTextAlign = () => isRTL ? 'text-right' : 'text-left';
  const getFlexDirection = () => isRTL ? 'flex-row-reverse' : 'flex-row';
  const getMarginLeft = (size) => isRTL ? `mr-${size}` : `ml-${size}`;
  const getMarginRight = (size) => isRTL ? `ml-${size}` : `mr-${size}`;
  const getPaddingLeft = (size) => isRTL ? `pr-${size}` : `pl-${size}`;
  const getPaddingRight = (size) => isRTL ? `pl-${size}` : `pr-${size}`;
  
  return {
    isRTL,
    language,
    changeLanguage,
    getTextAlign,
    getFlexDirection,
    getMarginLeft,
    getMarginRight,
    getPaddingLeft,
    getPaddingRight,
  };
};

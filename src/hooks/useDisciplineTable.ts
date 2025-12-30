import { useTranslation } from "react-i18next";

type DisciplineTable = "disciplines" | "disciplines_es" | "disciplines_fr";
type FuzzySearchFunction = "search_disciplines_fuzzy" | "search_disciplines_es_fuzzy" | "search_disciplines_fr_fuzzy";

interface DisciplineTableConfig {
  tableName: DisciplineTable;
  fuzzySearchFn: FuzzySearchFunction;
  locale: string;
}

export const useDisciplineTable = (): DisciplineTableConfig => {
  const { i18n } = useTranslation();
  
  const getConfig = (): DisciplineTableConfig => {
    switch (i18n.language) {
      case 'es':
        return {
          tableName: 'disciplines_es',
          fuzzySearchFn: 'search_disciplines_es_fuzzy',
          locale: 'es'
        };
      case 'fr':
        return {
          tableName: 'disciplines_fr',
          fuzzySearchFn: 'search_disciplines_fr_fuzzy',
          locale: 'fr'
        };
      default:
        return {
          tableName: 'disciplines',
          fuzzySearchFn: 'search_disciplines_fuzzy',
          locale: 'en'
        };
    }
  };
  
  return getConfig();
};

// Helper for edge functions (pass locale as parameter)
export const getDisciplineTableConfig = (locale: string): DisciplineTableConfig => {
  switch (locale) {
    case 'es':
      return {
        tableName: 'disciplines_es',
        fuzzySearchFn: 'search_disciplines_es_fuzzy',
        locale: 'es'
      };
    case 'fr':
      return {
        tableName: 'disciplines_fr',
        fuzzySearchFn: 'search_disciplines_fr_fuzzy',
        locale: 'fr'
      };
    default:
      return {
        tableName: 'disciplines',
        fuzzySearchFn: 'search_disciplines_fuzzy',
        locale: 'en'
      };
  }
};

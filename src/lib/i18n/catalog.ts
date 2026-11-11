export type Locale='en'|'ar'|'fr';
export const catalogs={
 en:{home:'Home',convert:'Convert',compress:'Compress',pdfTools:'PDF Tools',allTools:'All Tools',search:'Search tools',chooseFiles:'Choose Files',dropFiles:'Drop files here',download:'Download',downloadAll:'Download All as ZIP',startAgain:'Start Again',processing:'Processing…',completed:'Completed',failed:'Failed',cancelled:'Cancelled',comingSoon:'Coming soon',browseTools:'Browse all tools',privacy:'Privacy',terms:'Terms',about:'About'},
 ar:{home:'الرئيسية',convert:'تحويل',compress:'ضغط',pdfTools:'أدوات PDF',allTools:'كل الأدوات',search:'ابحث عن الأدوات',chooseFiles:'اختر الملفات',dropFiles:'أفلت الملفات هنا',download:'تنزيل',downloadAll:'تنزيل الكل كملف ZIP',startAgain:'ابدأ من جديد',processing:'جارٍ المعالجة…',completed:'مكتمل',failed:'فشل',cancelled:'أُلغي',comingSoon:'قريباً',browseTools:'تصفح الأدوات',privacy:'الخصوصية',terms:'الشروط',about:'حول'},
 fr:{home:'Accueil',convert:'Convertir',compress:'Compresser',pdfTools:'Outils PDF',allTools:'Tous les outils',search:'Rechercher un outil',chooseFiles:'Choisir des fichiers',dropFiles:'Déposez les fichiers ici',download:'Télécharger',downloadAll:'Tout télécharger en ZIP',startAgain:'Recommencer',processing:'Traitement…',completed:'Terminé',failed:'Échec',cancelled:'Annulé',comingSoon:'Bientôt',browseTools:'Voir tous les outils',privacy:'Confidentialité',terms:'Conditions',about:'À propos'},
} as const;
export type TranslationKey=keyof typeof catalogs.en;
export function t(key:TranslationKey,locale:Locale='en'):string{return catalogs[locale][key]??catalogs.en[key];}
export function direction(locale:Locale):'ltr'|'rtl'{return locale==='ar'?'rtl':'ltr';}

/** Single source of truth for Sana's Books India contact details. */
export const SUPPORT_EMAIL = "stationeriessana@gmail.com";
export const WHATSAPP_NUMBER = "919150113923";
export const WHATSAPP_DISPLAY = "+91 91501 13923";
export const ENQUIRY_ONLY_HANDLES = ["party-pals-goodie-bags"];
export const whatsappLink = (text: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
export const openEnquiry = (title: string, option?: string) =>
  window.open(
    whatsappLink(`Hi Sana's Books India, I'd like to enquire about ${title}${option ? ` (${option})` : ""}.`),
    "_blank",
    "noopener",
  );

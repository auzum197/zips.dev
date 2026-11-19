import * as page from "@/app/prs/[number]/[slug]/page";
import { localized } from "@/i18n/localized";
// The same page in the other languages: see src/i18n/localized.tsx.
const l = localized(page);
export const dynamicParams = false;
export const generateStaticParams = l.generateStaticParams;
export const generateMetadata = l.generateMetadata;
export default l.Page;

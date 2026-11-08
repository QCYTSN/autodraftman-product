import { Theme } from '@radix-ui/themes';
import '@fontsource-variable/noto-sans-sc';
import '@radix-ui/themes/layout.css';
import '../tokens.css';
import './base.css';
import SiteEntry from './SiteEntry';

export default function ProductSiteRoot() {
  return <Theme hasBackground={false} scaling="95%"><SiteEntry /></Theme>;
}

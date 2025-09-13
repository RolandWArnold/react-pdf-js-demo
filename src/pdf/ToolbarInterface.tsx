import PdfManager from './PdfManager';

export interface ToolbarProps {
  showFileName: boolean;
  fileName?: string;
  pdfManager?: PdfManager;
  uniqueIdentifier: string;
  isFileLoading?: boolean;
  jumpToPage?: number | null;
}

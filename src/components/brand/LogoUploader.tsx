import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { uploadLogo, resolveBrandAssetUrl } from "@/lib/officeBrand";
import { toast } from "sonner";

export function LogoUploader({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveBrandAssetUrl(value).then((u) => {
      if (!cancelled) setPreviewUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo precisa ter até 2MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadLogo(userId, file);
      onChange(url);
      toast.success("Logo atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao subir logo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-md border border-border/50 bg-background/50 overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt="Logo do escritório" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={onFile}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Enviar logo"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <Trash2 className="mr-2 h-4 w-4" /> Remover
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG ou WEBP, até 2MB.</p>
      </div>
    </div>
  );
}
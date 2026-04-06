"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Upload, FileSpreadsheet, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";

interface CSVRow {
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title?: string;
  linkedin_url?: string;
  phone?: string;
  website?: string;
  industry?: string;
}

export default function ImportLeadsPage() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  function parseCSV(text: string): CSVRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/['"]/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || "";
      });

      return {
        first_name: row.first_name || row.firstname || row["first name"] || "",
        last_name: row.last_name || row.lastname || row["last name"] || "",
        email: row.email || row.e_mail || "",
        company: row.company || row.organization || row.bedrijf || "",
        title: row.title || row.job_title || row.functie || "",
        linkedin_url: row.linkedin_url || row.linkedin || row.linkedin_profile || "",
        phone: row.phone || row.telefoon || row.mobile || "",
        website: row.website || row.url || "",
        industry: row.industry || row.industrie || "",
      };
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setParsedData(data);
    };
    reader.readAsText(selectedFile);
  }

  async function handleImport() {
    if (parsedData.length === 0) return;
    setImporting(true);
    setImported(0);
    setErrors([]);

    const validRows = parsedData.filter(
      (row) => row.email && row.first_name && row.last_name && row.company,
    );

    const invalidCount = parsedData.length - validRows.length;
    if (invalidCount > 0) {
      setErrors([
        `${invalidCount} ${t("importLeads.rowsSkipped")}`,
      ]);
    }

    // Import in batches of 50
    const batchSize = 50;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map((row) => ({
        ...row,
        status: "new" as const,
      }));

      const { error } = await supabase.from("leads").insert(batch);

      if (error) {
        setErrors((prev) => [...prev, `Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`]);
      } else {
        setImported((prev) => prev + batch.length);
      }
    }

    setImporting(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold">{t("importLeads.title")}</h2>
          <p className="text-neutral-500">{t("importLeads.subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("importLeads.csvUpload")}</CardTitle>
          <CardDescription>
            {t("importLeads.csvDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-8 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <>
                <FileSpreadsheet className="mb-2 h-8 w-8 text-green-500" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-neutral-500">
                  {parsedData.length} {t("importLeads.leadsFound")}
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-neutral-400" />
                <p className="font-medium">{t("importLeads.clickToUpload")}</p>
                <p className="text-sm text-neutral-500">
                  {t("importLeads.dragAndDrop")}
                </p>
              </>
            )}
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900">
                <p className="text-sm font-medium">{t("importLeads.preview")}</p>
                <div className="mt-2 space-y-1">
                  {parsedData.slice(0, 5).map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {row.email && row.first_name && row.company ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <X className="h-3 w-3 text-red-500" />
                      )}
                      <span>
                        {row.first_name} {row.last_name} - {row.email} -{" "}
                        {row.company}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {errors.length > 0 && (
                <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                  {errors.map((error, i) => (
                    <p key={i} className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  ))}
                </div>
              )}

              {imported > 0 && (
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {imported} {t("importLeads.successfullyImported")}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={importing || parsedData.length === 0}
                  className="flex-1"
                >
                  {importing
                    ? `${t("importLeads.importing")} (${imported}/${parsedData.length})`
                    : `${parsedData.length} ${t("importLeads.importLeads")}`}
                </Button>
                {imported > 0 && (
                  <Button variant="outline" onClick={() => router.push("/leads")}>
                    {t("importLeads.goToLeads")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

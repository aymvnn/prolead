import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/leads/export - Export leads as CSV
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const idsParam = searchParams.get("ids");
  const status = searchParams.get("status");

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  // Export specific leads by ID
  if (idsParam) {
    const ids = idsParam.split(",");
    query = query.in("id", ids);
  }

  // Filter by status
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No leads to export" },
      { status: 404 },
    );
  }

  // Build CSV
  const headers = [
    "first_name",
    "last_name",
    "email",
    "company",
    "title",
    "phone",
    "linkedin_url",
    "website",
    "industry",
    "employee_count",
    "status",
    "icp_score",
    "source",
    "created_at",
  ];

  const csvRows = [
    headers.join(","),
    ...data.map((lead) =>
      headers
        .map((h) => {
          const val = lead[h as keyof typeof lead];
          if (val === null || val === undefined) return "";
          const str = String(val);
          // Escape values containing commas or quotes
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    ),
  ];

  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prolead-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

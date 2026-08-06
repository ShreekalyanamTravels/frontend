import { NextRequest, NextResponse } from "next/server";
import { getInsurancePlans } from "@/app/lib/insurancePlans";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const result = await getInsurancePlans({
    type: sp.get("type") ?? "",
    dest: sp.get("dest") ?? "Worldwide",
    dep: sp.get("dep") ?? "",
    ret: sp.get("ret") ?? "",
    dob: sp.get("dob") ?? "",
  });
  return NextResponse.json(result);
}

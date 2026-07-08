import { Suspense } from "react";
import { DoctorAppointmentSellersPageContent } from "@/components/categories/DoctorAppointmentSellersPageContent";
import { categoryService } from "@/features/categories";
import { notFound } from "next/navigation";

interface DoctorAppointmentSellersPageProps {
  params: Promise<{ categoryId: string; specialtyId: string }>;
}

export function generateStaticParams(): Array<{ categoryId: string; specialtyId: string }> {
  const params: Array<{ categoryId: string; specialtyId: string }> = [];
  
  const medicalCategory = categoryService.getCategoryTree(20); // Medical Services ID
  if (medicalCategory && medicalCategory.doctorAppointmentItems) {
    for (const specialty of medicalCategory.doctorAppointmentItems) {
      params.push({
        categoryId: "20",
        specialtyId: String(specialty.originalId),
      });
    }
  }
  
  return params;
}

export default async function DoctorAppointmentSellersPage({
  params,
}: DoctorAppointmentSellersPageProps) {
  const { categoryId, specialtyId } = await params;
  const category = categoryService.getCategoryTree(Number(categoryId));
  
  if (!category) {
    notFound();
  }

  const specialty = category.doctorAppointmentItems?.find(
    (item) => item.originalId === Number(specialtyId)
  );

  if (!specialty) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DoctorAppointmentSellersPageContent 
        categoryId={Number(categoryId)}
        specialtyId={Number(specialtyId)}
        specialtyName={specialty.nameAr}
      />
    </Suspense>
  );
}

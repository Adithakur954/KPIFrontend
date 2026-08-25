import FileUploadCard from "@/features/uploads/components/FileUploadCard";
import { uploadKpisFile } from "@/features/uploads/services/uploadService";
import { useAuth } from "@/shared/context/AuthContext";

export default function UploadKpisPage() {
  const { user } = useAuth();

  const handleUpload = async (file) => {
    const uploadedBy = user?.email || "system";
    const remarks = "KPI Data upload";
    return uploadKpisFile(file, uploadedBy, remarks, { appendOption: "append" });
  };

  return (
    <div className="p-6">
      <FileUploadCard
        title="Upload KPIs Data"
        description="Upload your KPI metrics file in Excel or CSV format"
        acceptedFormats={[".xlsx", ".xls", ".csv"]}
        onUpload={handleUpload}
      />
    </div>
  );
}

import React from "react";
import { useEffect, useMemo, useState } from "react";
import UserContext from "./FileSelectionContext";

const GLOBAL_FILE_SELECTION_STORAGE_KEY = "globalSelectedKpiFileId:v1";

const FileContextProvider = ({ children }) => {
  const [selectedFileId, setSelectedFileId] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedValue = window.localStorage.getItem(
        GLOBAL_FILE_SELECTION_STORAGE_KEY,
      );
      if (!savedValue) return;
      setSelectedFileId(String(savedValue));
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        GLOBAL_FILE_SELECTION_STORAGE_KEY,
        String(selectedFileId || ""),
      );
    } catch {
      // ignore storage failures
    }
  }, [selectedFileId]);

  const value = useMemo(
    () => ({
      selectedFileId,
      setSelectedFileId,
      fileData: selectedFileId,
      setFileData: setSelectedFileId,
    }),
    [selectedFileId],
  );

  return (
    <UserContext.Provider value={value}>{children}</UserContext.Provider>
  );
};

export default FileContextProvider;

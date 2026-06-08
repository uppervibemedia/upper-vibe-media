import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// MyVibes was merged into Downloads — redirect there
export default function MyVibes() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/downloads", { replace: true }); }, []);
  return null;
}
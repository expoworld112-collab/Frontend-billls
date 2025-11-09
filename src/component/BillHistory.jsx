// BillHistory.jsx
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../App.css";

export default function BillHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get token from localStorage
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setError("Token missing. Please login.");
      setLoading(false);
      return;
    }

    const fetchBills = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/bills", {
          headers: {
            Authorization: `Bearer ${token}`, // GET doesn't need Content-Type
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch bills");
        }

        const data = await res.json();
        setBills(data);
      } catch (err) {
        console.error("Fetch error:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [token]);

  const generatePDF = (bill) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.width = "210mm";
    tempDiv.style.padding = "20px";
    tempDiv.style.backgroundColor = "#fff";

    tempDiv.innerHTML = `
      <h1 style="text-align:center;">INVOICE</h1>
      <p><strong>Invoice No:</strong> ${bill.invoiceNumber || bill._id}</p>
      <h3>From:</h3>
      <p>${bill.from.name}</p>
      <h3>To:</h3>
      <p>${bill.to.name}</p>
      <h3>Products:</h3>
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>#</th><th>Product</th><th>Price</th><th>Qty</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${bill.products
            .map(
              (p, i) => `<tr>
                <td>${i + 1}</td>
                <td>${p.name}</td>
                <td>${Number(p.price).toFixed(2)}</td>
                <td>${p.quantity}</td>
                <td>${(Number(p.price) * Number(p.quantity)).toFixed(2)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <h3>Subtotal: ${bill.subtotal.toFixed(2)}</h3>
      <p>CGST: ${bill.cgst.toFixed(2)}</p>
      <p>SGST: ${bill.sgst.toFixed(2)}</p>
      <h2>Total: ${bill.totalAmount.toFixed(2)}</h2>
    `;

    document.body.appendChild(tempDiv);

    html2canvas(tempDiv, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
      pdf.save(`invoice_${bill.invoiceNumber || bill._id}.pdf`);

      document.body.removeChild(tempDiv);
    });
  };

  if (loading) return <p>Loading bills...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!bills.length) return <p>No bills found.</p>;

  return (
    <div style={{ marginBottom: "30px" }}>
      <h2>Billing History</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice No</th>
            <th>Total Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map((bill, index) => (
            <tr key={bill._id} style={{ borderBottom: "1px solid #ccc" }}>
              <td>{index + 1}</td>
              <td>{bill.invoiceNumber || bill._id}</td>
              <td>{bill.totalAmount.toFixed(2)}</td>
              <td>
                <button onClick={() => generatePDF(bill)}>Download PDF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

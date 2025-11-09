import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";
import Login from "./component/Login.jsx";
import BillHistory from "./component/BillHistory.jsx";
import Register from "./pages/register.jsx";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [showRegister, setShowRegister] = useState(false);

  const [from, setFrom] = useState({ name: "", gstNo: "", address: "", email: "" });
  const [to, setTo] = useState({ name: "", gstNo: "", address: "", email: "" });
  const [transport, setTransport] = useState({ id: "", type: "", vehicleNo: "" });
  const [gstRate, setGstRate] = useState(18);
  const [products, setProducts] = useState([{ name: "", price: "", quantity: "" }]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [logo, setLogo] = useState(null);
  const [previewURL, setPreviewURL] = useState("");

  const pdfRef = useRef();
  const debounceTimer = useRef(null);

  const currentDateTime = new Date();
  const formattedDate = currentDateTime.toLocaleDateString("en-IN");
  const formattedTime = currentDateTime.toLocaleTimeString("en-IN", { hour12: true });

  useEffect(() => setInvoiceNumber(generateInvoiceNumber()), []);

  const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${now.getTime()}`;
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };
  const addProductRow = () => setProducts([...products, { name: "", price: "", quantity: "" }]);
  const removeProductRow = (index) => setProducts(products.filter((_, i) => i !== index));

  const { subtotal, cgst, sgst, totalAmount } = useMemo(() => {
    const sub = products.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    const gst = (sub * gstRate) / 100;
    return { subtotal: sub, cgst: gst / 2, sgst: gst / 2, totalAmount: sub + gst };
  }, [products, gstRate]);

  const formatCurrency = (amount) =>
    amount ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount) : "";

  const generatePDF = useCallback(
    (forPreview = false) => {
      const input = pdfRef.current;
      if (!input) return;

      html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        if (forPreview) setPreviewURL(pdf.output("bloburl"));
        else pdf.save(`invoice_${invoiceNumber}.pdf`);
      });
    },
    [invoiceNumber, products, gstRate, logo]
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => generatePDF(true), 800);
    return () => clearTimeout(debounceTimer.current);
  }, [from, to, transport, gstRate, products, logo, generatePDF]);

  const handleSubmit = async () => {
    for (const p of products) {
      if (!p.name || p.price <= 0 || p.quantity <= 0) {
        alert("All products must have valid name, price, and quantity.");
        return;
      }
    }

    const invoiceData = {
      from,
      to,
      transport,
      gstRate,
      products,
      invoiceNumber,
      subtotal,
      cgst,
      sgst,
      totalAmount,
      date: formattedDate,
      time: formattedTime,
      logo,
    };

    try {
      const res = await fetch("http://localhost:5000/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoiceData),
      });

      if (!res.ok) throw new Error("Failed to save invoice");

      alert("Invoice saved successfully!");
      generatePDF(false);
    } catch (err) {
      console.error(err);
      alert("Error saving invoice. Check console.");
    }
  };

  if (!token) {
    return showRegister ? (
      <Register
        setToken={(t) => {
          setToken(t);
          localStorage.setItem("token", t);
        }}
      />
    ) : (
      <Login
        setToken={(t) => {
          setToken(t);
          localStorage.setItem("token", t);
        }}
        switchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className="container">
      <BillHistory token={token} />

      <div className="preview-section">
        <h2>Invoice Preview</h2>
        {previewURL ? (
          <iframe
            src={previewURL}
            title="Invoice Preview"
            width="100%"
            height="700px"
            style={{ border: "1px solid #ccc", borderRadius: "8px" }}
          />
        ) : (
          <p style={{ textAlign: "center", color: "#888" }}>Preview will appear here...</p>
        )}
      </div>

      <div className="form-section">
        <h1>Billing App</h1>

        <div className="section">
          <h2>Invoice Details</h2>
          <input type="text" value={invoiceNumber} readOnly style={{ backgroundColor: "#f0f0f0" }} />
        </div>

        <div className="section">
          <h2>Logo (Optional)</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setLogo(ev.target.result);
                reader.readAsDataURL(file);
              }
            }}
          />
          {logo && <img src={logo} alt="Logo Preview" style={{ maxHeight: "80px", marginTop: "10px" }} />}
        </div>

        <div className="section">
          <h2>From (Your Company)</h2>
          {["name", "gstNo", "address", "email"].map((f) => (
            <input
              key={f}
              placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
              value={from[f]}
              onChange={(e) => setFrom({ ...from, [f]: e.target.value })}
            />
          ))}
        </div>

        <div className="section">
          <h2>To (Customer)</h2>
          {["name", "gstNo", "address", "email"].map((f) => (
            <input
              key={f}
              placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
              value={to[f]}
              onChange={(e) => setTo({ ...to, [f]: e.target.value })}
            />
          ))}
        </div>

        <div className="section">
          <h2>Transport Details</h2>
          {["id", "type", "vehicleNo"].map((f) => (
            <input
              key={f}
              placeholder={f === "vehicleNo" ? "Vehicle No" : f.charAt(0).toUpperCase() + f.slice(1)}
              value={transport[f]}
              onChange={(e) => setTransport({ ...transport, [f]: e.target.value })}
            />
          ))}
        </div>

        <div className="section">
          <h2>Products</h2>
          {products.map((p, i) => (
            <div className="product-row" key={i}>
              <input
                placeholder="Name"
                value={p.name}
                onChange={(e) => handleProductChange(i, "name", e.target.value)}
              />
              <input
                type="number"
                placeholder="Price"
                value={p.price}
                onChange={(e) => handleProductChange(i, "price", e.target.value)}
                min="0"
              />
              <input
                type="number"
                placeholder="Qty"
                value={p.quantity}
                onChange={(e) => handleProductChange(i, "quantity", e.target.value)}
                min="0"
              />
              <button type="button" onClick={() => removeProductRow(i)}>
                ❌
              </button>
            </div>
          ))}
          <button type="button" onClick={addProductRow}>
            ➕ Add Product
          </button>
        </div>

        <div className="section totals">
          <label>GST %:</label>
          <input
            type="number"
            value={gstRate}
            onChange={(e) => setGstRate(Number(e.target.value))}
            min="0"
            max="100"
            style={{ width: "60px", marginLeft: "10px" }}
          />
          <p>Date: {formattedDate}</p>
          <p>Time: {formattedTime}</p>
          <p>Subtotal: {formatCurrency(subtotal)}</p>
          <p>CGST: {formatCurrency(cgst)}</p>
          <p>SGST: {formatCurrency(sgst)}</p>
          <h3>Total: {formatCurrency(totalAmount)}</h3>
        </div>

        <div className="section">
          <button type="button" className="submit-btn" onClick={handleSubmit}>
            Submit Bill & Generate PDF
          </button>
        </div>
      </div>

      {/* Hidden PDF Template */}
      <div
        ref={pdfRef}
        style={{
          position: "absolute",
          left: "-9999px",
          width: "210mm",
          padding: "30px",
          backgroundColor: "#ffffff",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          color: "#333",
          border: "1px solid #e0e0e0",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px" }}>
          <div>
            {logo && <img src={logo} alt="Logo" style={{ maxHeight: "80px", marginBottom: "10px" }} />}
            <h2 style={{ margin: 0, color: "#2c3e50" }}>{from.name}</h2>
            <p style={{ margin: "2px 0" }}>{from.address}</p>
            <p style={{ margin: "2px 0" }}>GST: {from.gstNo}</p>
            <p style={{ margin: "2px 0" }}>{from.email}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={{ color: "#2980b9" }}>INVOICE</h1>
            <p style={{ margin: "2px 0" }}># {invoiceNumber}</p>
            <p style={{ margin: "2px 0" }}>Date: {formattedDate}</p>
          </div>
        </div>

        {/* From / To / Transport */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            backgroundColor: "#ecf0f1",
            padding: "15px",
            borderRadius: "5px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 5px 0" }}>Bill To:</h3>
            <p style={{ margin: "2px 0" }}>{to.name}</p>
            <p style={{ margin: "2px 0" }}>{to.address}</p>
            <p style={{ margin: "2px 0" }}>GST: {to.gstNo}</p>
            <p style={{ margin: "2px 0" }}>{to.email}</p>
          </div>
          <div>
            <h3 style={{ margin: "0 0 5px 0" }}>Transport:</h3>
            <p style={{ margin: "2px 0" }}>ID: {transport.id}</p>
            <p style={{ margin: "2px 0" }}>Type: {transport.type}</p>
            <p style={{ margin: "2px 0" }}>Vehicle: {transport.vehicleNo}</p>
          </div>
        </div>

        {/* Products Table */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#2980b9", color: "#fff" }}>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>#</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Product</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Price</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Qty</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f9f9f9" : "#ffffff" }}>
                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{i + 1}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{p.name}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>{formatCurrency(p.price)}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px", textAlign: "center" }}>{p.quantity}</td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {formatCurrency(p.price * p.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <p style={{ margin: "2px 0" }}>Subtotal: {formatCurrency(subtotal)}</p>
          <p style={{ margin: "2px 0" }}>CGST ({gstRate / 2}%): {formatCurrency(cgst)}</p>
          <p style={{ margin: "2px 0" }}>SGST ({gstRate / 2}%): {formatCurrency(sgst)}</p>
          <h2 style={{ margin: "5px 0 0 0", color: "#27ae60" }}>Total: {formatCurrency(totalAmount)}</h2>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "40px",
            textAlign: "center",
            color: "#7f8c8d",
            fontSize: "12px",
            borderTop: "1px solid #bdc3c7",
            paddingTop: "10px",
          }}
        >
          Thank you for your business! | Generated by Billing App
        </div>
      </div>
    </div>
  );
}

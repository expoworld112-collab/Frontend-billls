import { useState, useEffect, useRef, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

export default function App() {
  const [from, setFrom] = useState({ name: "", gstNo: "", address: "", email: "" });
  const [to, setTo] = useState({ name: "", gstNo: "", address: "", email: "" });
  const [transport, setTransport] = useState({ id: "", type: "" });
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

  useEffect(() => {
    setInvoiceNumber(generateInvoiceNumber());
  }, []);

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

  const addProductRow = () => {
    setProducts([...products, { name: "", price: "", quantity: "" }]);
  };

  const removeProductRow = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const { subtotal, cgst, sgst, totalAmount } = useMemo(() => {
    const sub = products.reduce(
      (acc, p) => acc + (Number(p.price) || 0) * (Number(p.quantity) || 0),
      0
    );
    const gst = (sub * gstRate) / 100;
    return {
      subtotal: sub,
      cgst: gst / 2,
      sgst: gst / 2,
      totalAmount: sub + gst,
    };
  }, [products, gstRate]);

  const formatCurrency = (amount) =>
    amount
      ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)
      : "";

  const generatePDF = (forPreview = false) => {
    const input = pdfRef.current;
    if (!input) return;

    html2canvas(input, { scale: 2, useCORS: true, logging: false }).then((canvas) => {
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
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      if (forPreview) {
        setPreviewURL(pdf.output("bloburl"));
      } else {
        pdf.save(`invoice_${invoiceNumber}.pdf`);
      }
    });
  };

  /* 🕒 Auto-generate preview (debounced) */
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => generatePDF(true), 800);
    return () => clearTimeout(debounceTimer.current);
  }, [from, to, transport, gstRate, products, logo]);

  return (
    <div className="container">
      {/* Left: Live Preview */}
      <div className="preview-section">
        <h2>Invoice Preview</h2>
        {previewURL ? (
          <iframe
            src={previewURL}
            title="Invoice Preview"
            width="100%"
            height="100%"
            style={{ border: "1px solid #ccc" }}
          />
        ) : (
          <p style={{ textAlign: "center" }}>Preview will appear here...</p>
        )}
      </div>

      {/* Right: Billing Form */}
      <div className="form-section">
        <h1>Billing App</h1>

        {/* Invoice Number */}
        <div className="section">
          <h2>Invoice Details</h2>
          <input
            type="text"
            value={invoiceNumber}
            readOnly
            style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }}
          />
        </div>

        {/* Logo */}
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

        {/* From */}
        <div className="section">
          <h2>From</h2>
          <input type="text" placeholder="Name" value={from.name} onChange={(e) => setFrom({ ...from, name: e.target.value })} />
          <input type="text" placeholder="GST No" value={from.gstNo} onChange={(e) => setFrom({ ...from, gstNo: e.target.value })} />
          <input type="text" placeholder="Address" value={from.address} onChange={(e) => setFrom({ ...from, address: e.target.value })} />
          <input type="email" placeholder="Email" value={from.email} onChange={(e) => setFrom({ ...from, email: e.target.value })} />
        </div>

        {/* To */}
        <div className="section">
          <h2>To</h2>
          <input type="text" placeholder="Name" value={to.name} onChange={(e) => setTo({ ...to, name: e.target.value })} />
          <input type="text" placeholder="GST No" value={to.gstNo} onChange={(e) => setTo({ ...to, gstNo: e.target.value })} />
          <input type="text" placeholder="Address" value={to.address} onChange={(e) => setTo({ ...to, address: e.target.value })} />
          <input type="email" placeholder="Email" value={to.email} onChange={(e) => setTo({ ...to, email: e.target.value })} />
        </div>

        {/* Transport */}
        <div className="section">
          <h2>Transport</h2>
          <input type="text" placeholder="ID" value={transport.id} onChange={(e) => setTransport({ ...transport, id: e.target.value })} />
          <input type="text" placeholder="Type" value={transport.type} onChange={(e) => setTransport({ ...transport, type: e.target.value })} />
        </div>

        {/* Products */}
        <div className="section">
          <h2>Products</h2>
          {products.map((p, index) => (
            <div className="product-row" key={index}>
              <input type="text" placeholder="Name" value={p.name} onChange={(e) => handleProductChange(index, "name", e.target.value)} />
              <input type="number" placeholder="Price" value={p.price} onChange={(e) => handleProductChange(index, "price", e.target.value)} min="0" />
              <input type="number" placeholder="Qty" value={p.quantity} onChange={(e) => handleProductChange(index, "quantity", e.target.value)} min="0" />
              <button type="button" onClick={() => removeProductRow(index)}>❌</button>
            </div>
          ))}
          <button type="button" onClick={addProductRow}>➕ Add Product</button>
        </div>

        {/* GST & Totals */}
        <div className="section totals">
          <label>GST %:</label>
          <input type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} min="0" max="100" style={{ width: "60px", marginLeft: "10px" }} />
          <p>Date: {formattedDate}</p>
          <p>Time: {formattedTime}</p>
          <p>Subtotal: {formatCurrency(subtotal)}</p>
          <p>CGST: {formatCurrency(cgst)}</p>
          <p>SGST: {formatCurrency(sgst)}</p>
          <h3>Total: {formatCurrency(totalAmount)}</h3>
        </div>

        {/* Submit & Generate PDF */}
        <div className="section">
          <button
            type="button"
            className="submit-btn"
            onClick={() => generatePDF(false)}
          >
            Submit Bill & Generate PDF
          </button>
        </div>
      </div>

      {/* Hidden PDF Template */}
      <div
        ref={pdfRef}
        id="pdf-container"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "210mm",
          padding: "20px",
          backgroundColor: "#fff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          {logo && <img src={logo} alt="Logo" style={{ maxHeight: "80px" }} />}
          <h1>INVOICE</h1>
          <p><strong>Invoice No:</strong> {invoiceNumber}</p>
          <p><strong>Date:</strong> {formattedDate} | <strong>Time:</strong> {formattedTime}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h3>From:</h3>
            <p>{from.name}</p>
            <p>GST No: {from.gstNo}</p>
            <p>{from.address}</p>
            <p>{from.email}</p>
          </div>
          <div>
            <h3>To:</h3>
            <p>{to.name}</p>
            <p>GST No: {to.gstNo}</p>
            <p>{to.address}</p>
            <p>{to.email}</p>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{p.name}</td>
                <td>{formatCurrency(Number(p.price))}</td>
                <td>{p.quantity}</td>
                <td>{formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "right", marginTop: "15px" }}>
          <p>Subtotal: {formatCurrency(subtotal)}</p>
          <p>CGST: {formatCurrency(cgst)}</p>
          <p>SGST: {formatCurrency(sgst)}</p>
          <h3>Total: {formatCurrency(totalAmount)}</h3>
        </div>

        {transport.id && (
          <div style={{ marginTop: "20px" }}>
            <h3>Transport Details:</h3>
            <p>ID: {transport.id}</p>
            <p>Type: {transport.type}</p>
          </div>
        )}
      </div>
    </div>
  );
}

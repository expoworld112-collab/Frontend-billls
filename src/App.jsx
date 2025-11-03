import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

export default function App() {
  const [bills, setBills] = useState([]);
  const [from, setFrom] = useState({ name: "", gstNo: "", address: "", email: "" });
  const [to, setTo] = useState({ name: "", gstNo: "", address: "", email: "" });
  const [transport, setTransport] = useState({ id: "", type: "" });
  const [gstRate, setGstRate] = useState(18);
  const [products, setProducts] = useState([{ name: "", price: "", quantity: "" }]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [logo, setLogo] = useState(null); // store logo as data URL
  const pdfRef = useRef();

  const currentDateTime = new Date();
  const formattedDate = currentDateTime.toLocaleDateString("en-IN");
  const formattedTime = currentDateTime.toLocaleTimeString("en-IN", { hour12: true });

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/bills");
        setBills(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBills();
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

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (products.every((p) => !p.name || !p.price || !p.quantity)) {
      alert("Please add at least one product with valid details.");
      return;
    }

    try {
      const payload = {
        invoiceNumber,
        from,
        to,
        transport,
        gstRate: Number(gstRate),
        date: formattedDate,
        time: formattedTime,
        products: products.map((p) => ({
          name: p.name,
          price: Number(p.price),
          quantity: Number(p.quantity),
          total: (Number(p.price) || 0) * (Number(p.quantity) || 0),
        })),
        totalAmount,
      };

      await axios.post("http://localhost:5000/api/bills", payload);

      generatePDF();

      // Reset form
      setFrom({ name: "", gstNo: "", address: "", email: "" });
      setTo({ name: "", gstNo: "", address: "", email: "" });
      setTransport({ id: "", type: "" });
      setProducts([{ name: "", price: "", quantity: "" }]);
      setGstRate(18);
      setInvoiceNumber(generateInvoiceNumber());
      setLogo(null);

      alert("Bill submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit bill. Check console for details.");
    }
  };

  const generatePDF = () => {
    const input = pdfRef.current;
    html2canvas(input, { scale: 3, useCORS: true }).then((canvas) => {
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

      pdf.save(`invoice_${invoiceNumber}.pdf`);
    });
  };

  return (
    <div className="container">
      <h1>Billing App</h1>
      <div className="main-layout">
        {/* LEFT: Preview Section */}
        <div className="preview-section">
          <h2>Live Preview</h2>
          <div className="preview-box">
            <div ref={pdfRef} className="invoice-preview">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {logo && <img src={logo} alt="Logo" style={{ maxHeight: "60px" }} />}
                </div>
                <div style={{ textAlign: "center" }}>
                  <h1>INVOICE</h1>
                  <p>Tax Invoice / Bill of Supply</p>
                  <p><strong>Invoice No:</strong> {invoiceNumber}</p>
                  <p><strong>Date:</strong> {formattedDate}</p>
                  <p><strong>Time:</strong> {formattedTime}</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
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
                    <th style={{ border: "1px solid #000", padding: "8px" }}>#</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Product</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Price</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Quantity</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i}>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "center" }}>{i + 1}</td>
                      <td style={{ border: "1px solid #000", padding: "5px" }}>{p.name}</td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right" }}>{formatCurrency(Number(p.price))}</td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "center" }}>{p.quantity}</td>
                      <td style={{ border: "1px solid #000", padding: "5px", textAlign: "right" }}>
                        {formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: "20px", textAlign: "right", fontWeight: "bold" }}>
                <p>Subtotal: {formatCurrency(subtotal)}</p>
                <p>CGST ({gstRate / 2}%): {formatCurrency(cgst)}</p>
                <p>SGST ({gstRate / 2}%): {formatCurrency(sgst)}</p>
                <h3>Total: {formatCurrency(totalAmount)}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Form Section */}
        <form onSubmit={handleSubmit} className="bill-form">
          <div className="section">
            <h2>Invoice Details</h2>
            <input type="text" value={invoiceNumber} readOnly style={{ backgroundColor: "#f0f0f0", cursor: "not-allowed" }} />
          </div>

          <div className="section">
            <h2>Logo (Optional)</h2>
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </div>

          <div className="section">
            <h2>From</h2>
            <input type="text" placeholder="Name" value={from.name} onChange={(e) => setFrom({ ...from, name: e.target.value })} required />
            <input type="text" placeholder="GST No" value={from.gstNo} onChange={(e) => setFrom({ ...from, gstNo: e.target.value })} required />
            <input type="text" placeholder="Address" value={from.address} onChange={(e) => setFrom({ ...from, address: e.target.value })} />
            <input type="email" placeholder="Email" value={from.email} onChange={(e) => setFrom({ ...from, email: e.target.value })} />
          </div>

          <div className="section">
            <h2>To</h2>
            <input type="text" placeholder="Name" value={to.name} onChange={(e) => setTo({ ...to, name: e.target.value })} required />
            <input type="text" placeholder="GST No" value={to.gstNo} onChange={(e) => setTo({ ...to, gstNo: e.target.value })} required />
            <input type="text" placeholder="Address" value={to.address} onChange={(e) => setTo({ ...to, address: e.target.value })} />
            <input type="email" placeholder="Email" value={to.email} onChange={(e) => setTo({ ...to, email: e.target.value })} />
          </div>

          <div className="section">
            <h2>Transport</h2>
            <input type="text" placeholder="ID" value={transport.id} onChange={(e) => setTransport({ ...transport, id: e.target.value })} />
            <input type="text" placeholder="Type" value={transport.type} onChange={(e) => setTransport({ ...transport, type: e.target.value })} />
          </div>

          <div className="section">
            <h2>Products</h2>
            {products.map((p, index) => (
              <div className="product-row" key={index}>
                <input type="text" placeholder="Name" value={p.name} onChange={(e) => handleProductChange(index, "name", e.target.value)} required />
                <input type="number" placeholder="Price" value={p.price} onChange={(e) => handleProductChange(index, "price", e.target.value)} min="0" required />
                <input type="number" placeholder="Quantity" value={p.quantity} onChange={(e) => handleProductChange(index, "quantity", e.target.value)} min="0" required />
                <button type="button" onClick={() => removeProductRow(index)}>❌</button>
              </div>
            ))}
            <button type="button" onClick={addProductRow}>➕ Add Product</button>
          </div>

          <div className="section">
            <label>GST %:</label>
            <input type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} min="0" />
          </div>

          <button type="submit" className="submit-btn">Generate PDF & Save</button>
        </form>
      </div>
    </div>
  );
}

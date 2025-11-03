import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

export default function App() {
  const [bills, setBills] = useState([]);
  const [from, setFrom] = useState({ name: "", gstNo: "" });
  const [to, setTo] = useState({ name: "", gstNo: "" });
  const [transport, setTransport] = useState({ id: "", type: "" });
  const [gstRate, setGstRate] = useState(18);
  const [products, setProducts] = useState([{ name: "", price: "", quantity: "" }]);
  const pdfRef = useRef();

  // Generate date & time
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
  }, []);

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
    amount ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount) : "";

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate at least one product
    if (products.every(p => !p.name || !p.price || !p.quantity)) {
      alert("Please add at least one product with valid details.");
      return;
    }

    try {
      const payload = {
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

      // Reset form after PDF generation
      setFrom({ name: "", gstNo: "" });
      setTo({ name: "", gstNo: "" });
      setTransport({ id: "", type: "" });
      setProducts([{ name: "", price: "", quantity: "" }]);
      setGstRate(18);

      alert("Bill submitted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to submit bill. Check console for details.");
    }
  };

  // const generatePDF = () => {
  //   const input = pdfRef.current;
  //   html2canvas(input, { scale: 2 }).then((canvas) => {
  //     const imgData = canvas.toDataURL("image/png");
  //     const pdf = new jsPDF("p", "mm", "a4");
  //     const pdfWidth = pdf.internal.pageSize.getWidth();
  //     const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  //     pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  //     pdf.save(`bill_${formattedDate}_${formattedTime.replace(/[: ]/g, "_")}.pdf`);
  //   });
  // };
  const generatePDF = () => {
  const input = pdfRef.current;

  html2canvas(input, { scale: 3, useCORS: true, logging: false }).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate the image height proportional to PDF width
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Add pages if content overflows
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight; // position relative to next page
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`bill_${formattedDate}_${formattedTime.replace(/[: ]/g, "_")}.pdf`);
  });
};


  return (
    <div className="container">
      <h1>Billing App</h1>

      <form onSubmit={handleSubmit} className="bill-form">
        <div className="section">
          <h2>From</h2>
          <input
            type="text"
            placeholder="Name"
            value={from.name}
            onChange={(e) => setFrom({ ...from, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="GST No"
            value={from.gstNo}
            onChange={(e) => setFrom({ ...from, gstNo: e.target.value })}
            required
          />
        </div>

        <div className="section">
          <h2>To</h2>
          <input
            type="text"
            placeholder="Name"
            value={to.name}
            onChange={(e) => setTo({ ...to, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="GST No"
            value={to.gstNo}
            onChange={(e) => setTo({ ...to, gstNo: e.target.value })}
            required
          />
        </div>

        <div className="section">
          <h2>Transport</h2>
          <input
            type="text"
            placeholder="ID"
            value={transport.id}
            onChange={(e) => setTransport({ ...transport, id: e.target.value })}
          />
          <input
            type="text"
            placeholder="Type"
            value={transport.type}
            onChange={(e) => setTransport({ ...transport, type: e.target.value })}
          />
        </div>

        <div className="section">
          <h2>Products</h2>
          {products.map((p, index) => (
            <div className="product-row" key={index}>
              <input
                type="text"
                placeholder="Name"
                value={p.name}
                onChange={(e) => handleProductChange(index, "name", e.target.value)}
                required
              />
              <input
                type="number"
                placeholder="Price"
                value={p.price}
                onChange={(e) => handleProductChange(index, "price", e.target.value)}
                min="0"
                required
              />
              <input
                type="number"
                placeholder="Quantity"
                value={p.quantity}
                onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
                min="0"
                required
              />
              <button type="button" onClick={() => removeProductRow(index)}>
                ❌
              </button>
            </div>
          ))}
          <button type="button" onClick={addProductRow}>
            ➕ Add Product
          </button>
        </div>

        <div className="section">
          <label>GST %</label>
          <input
            type="number"
            value={gstRate}
            onChange={(e) => setGstRate(Number(e.target.value))}
            min="0"
            max="100"
            required
          />
        </div>

        <div className="totals">
          <p>Date: {formattedDate}</p>
          <p>Time: {formattedTime}</p>
          <p>Subtotal: {formatCurrency(subtotal)}</p>
          <p>CGST: {formatCurrency(cgst)}</p>
          <p>SGST: {formatCurrency(sgst)}</p>
          <h3>Total: {formatCurrency(totalAmount)}</h3>
        </div>

        <button type="submit" className="submit-btn">
          Submit Bill & Generate PDF
        </button>
      </form>

      {/* Hidden PDF template */}
      <div
        ref={pdfRef}
        id="pdf-container"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "210mm",
          padding: "20px",
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#fff",
          color: "#000",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1>INVOICE</h1>
          <p>Tax Invoice / Bill of Supply</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <h3>From:</h3>
            <p>{from.name}</p>
            <p>GST No: {from.gstNo}</p>
          </div>
          <div>
            <h3>To:</h3>
            <p>{to.name}</p>
            <p>GST No: {to.gstNo}</p>
          </div>
        </div>

        <p>
          <strong>Date:</strong> {formattedDate} &nbsp;&nbsp;
          <strong>Time:</strong> {formattedTime}
        </p>

        <div style={{ marginBottom: "20px" }}>
          <h3>Transport:</h3>
          <p>ID: {transport.id}</p>
          <p>Type: {transport.type}</p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid black" }}>
              <th style={{ border: "1px solid black", padding: "8px" }}>Item</th>
              <th style={{ border: "1px solid black", padding: "8px" }}>Price</th>
              <th style={{ border: "1px solid black", padding: "8px" }}>Qty</th>
              <th style={{ border: "1px solid black", padding: "8px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid black", padding: "8px" }}>{p.name || ""}</td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {p.price ? formatCurrency(Number(p.price)) : ""}
                </td>
                <td style={{ border: "1px solid black", padding: "8px" }}>{p.quantity || ""}</td>
                <td style={{ border: "1px solid black", padding: "8px" }}>
                  {p.price && p.quantity ? formatCurrency(Number(p.price) * Number(p.quantity)) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: "right", marginBottom: "20px" }}>
          <p>Subtotal: {formatCurrency(subtotal)}</p>
          <p>CGST ({gstRate / 2}%): {formatCurrency(cgst)}</p>
          <p>SGST ({gstRate / 2}%): {formatCurrency(sgst)}</p>
          <h3>Total: {formatCurrency(totalAmount)}</h3>
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}

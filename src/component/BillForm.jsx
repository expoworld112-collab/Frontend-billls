import React, { useState } from "react";
import axios from "axios";
import "../App.css";


const BillForm = ({ generatePDF }) => {
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [products, setProducts] = useState([{ name: "", price: "", quantity: "" }]);
  const [message, setMessage] = useState("");

  const addProduct = () => setProducts([...products, { name: "", price: "", quantity: "" }]);

  const handleProductChange = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const submitBill = async () => {
    try {
      const payload = {
        from: { name: fromName },
        to: { name: toName },
        gstRate: Number(gstRate),
        products: products.map(p => ({
          name: p.name,
          price: Number(p.price),
          quantity: Number(p.quantity),
        })),
      };

      const res = await axios.post("http://localhost:5000/api/bills", payload, {
        headers: { "Content-Type": "application/json" },
      });

      setMessage("✅ Bill saved successfully!");
      setFromName("");
      setToName("");
      setGstRate(18);
      setProducts([{ name: "", price: "", quantity: "" }]);

      if (generatePDF) generatePDF(res.data);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to save bill. Check console.");
    }
  };

  return (
    <div>
      <h2>Create New Bill</h2>
      <input placeholder="From Name" value={fromName} onChange={e => setFromName(e.target.value)} required />
      <input placeholder="To Name" value={toName} onChange={e => setToName(e.target.value)} required />
      <input type="number" placeholder="GST Rate" value={gstRate} onChange={e => setGstRate(e.target.value)} required />

      <h3>Products</h3>
      {products.map((p, i) => (
        <div key={i}>
          <input placeholder="Name" value={p.name} onChange={e => handleProductChange(i, "name", e.target.value)} required />
          <input type="number" placeholder="Price" value={p.price} onChange={e => handleProductChange(i, "price", e.target.value)} required />
          <input type="number" placeholder="Quantity" value={p.quantity} onChange={e => handleProductChange(i, "quantity", e.target.value)} required />
        </div>
      ))}

      <button type="button" onClick={addProduct}>+ Add Product</button>
      <button type="button" onClick={submitBill}>Submit Bill & Generate PDF</button>

      <p>{message}</p>
    </div>
  );
};

export default BillForm;

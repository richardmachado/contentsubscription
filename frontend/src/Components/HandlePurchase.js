const handlePurchase = async (itemId, token) => {
  const res = await fetch("http://localhost:5000/api/buy/" + itemId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    alert("Error: " + (data.error || "Could not create checkout session"));
  }
};

export default handlePurchase;

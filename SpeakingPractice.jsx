{correction && (
  <div
    style={{
      backgroundColor: colors.goldSoft,
      border: `1px solid ${colors.gold}`,
      borderRadius: 12,
      padding: "10px 12px",
      marginBottom: 4,
    }}
  >
    <p style={{ fontSize: 13, fontWeight: 700, color: colors.ink, marginBottom: 4 }}>
      ✏️ تصحیح
    </p>
    <p style={{ fontSize: 12, color: colors.inkSoft, lineHeight: 1.6 }}>
      <span style={{ fontWeight: 600, color: colors.rose }}>اشتباه: </span>
      <span style={{ color: colors.rose }}>{correction.original}</span>
      <br />
      <span style={{ fontWeight: 600, color: colors.teal }}>پیشنهاد: </span>
      <span style={{ fontWeight: "bold", color: colors.teal }}>{correction.corrected}</span>
    </p>
  </div>
)}
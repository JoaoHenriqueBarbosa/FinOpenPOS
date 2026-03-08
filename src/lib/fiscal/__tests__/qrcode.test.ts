import { describe, it, expect } from "bun:test";
import { buildNfceQrCodeUrl, buildNfceConsultUrl } from "../qrcode";

describe("buildNfceQrCodeUrl — v200", () => {
  it("generates online QR Code URL (tpEmis=1)", async () => {
    const url = await buildNfceQrCodeUrl({
      version: "200",
      accessKey: "35260112345678000199650010000000011123456780",
      environment: 2,
      emissionType: 1,
      cscId: "000001",
      cscToken: "ABCDEF123456",
      qrCodeBaseUrl: "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode",
    });

    expect(url).toContain("https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=");
    expect(url).toContain("35260112345678000199650010000000011123456780");
    expect(url).toContain("|2|"); // version
    expect(url).toContain("|2|"); // tpAmb
    // Should contain cscId and end with hex hash
    expect(url).toMatch(/\|[0-9A-F]{40}$/);
  });

  it("generates offline QR Code URL (tpEmis=9)", async () => {
    const url = await buildNfceQrCodeUrl({
      version: "200",
      accessKey: "35260112345678000199650010000000011123456780",
      environment: 2,
      emissionType: 9,
      cscId: "000001",
      cscToken: "ABCDEF123456",
      qrCodeBaseUrl: "https://example.com/qrcode",
      issuedAt: "2026-01-15T10:30:00-03:00",
      totalValue: "100.00",
      digestValue: "abc123digest==",
    });

    expect(url).toContain("?p=");
    expect(url).toContain("|2|"); // version
  });

  it("throws without CSC for v200", async () => {
    await expect(
      buildNfceQrCodeUrl({
        version: "200",
        accessKey: "35260112345678000199650010000000011123456780",
        environment: 2,
        emissionType: 1,
        cscId: "",
        cscToken: "",
        qrCodeBaseUrl: "https://example.com/qrcode",
      })
    ).rejects.toThrow();
  });
});

describe("buildNfceQrCodeUrl — v300", () => {
  it("generates online QR Code URL (no CSC needed)", async () => {
    const url = await buildNfceQrCodeUrl({
      version: "300",
      accessKey: "35260112345678000199650010000000011123456780",
      environment: 2,
      emissionType: 1,
      qrCodeBaseUrl: "https://example.com/qrcode",
    });

    expect(url).toContain("?p=");
    expect(url).toContain("|3|"); // version 3
    expect(url).toContain("|2"); // tpAmb
  });
});

describe("buildNfceConsultUrl", () => {
  it("builds consultation URL", () => {
    const url = buildNfceConsultUrl(
      "https://www.homologacao.nfce.fazenda.sp.gov.br/consulta",
      "35260112345678000199650010000000011123456780",
      2
    );

    expect(url).toContain("https://www.homologacao.nfce.fazenda.sp.gov.br/consulta");
    expect(url).toContain("35260112345678000199650010000000011123456780");
  });
});

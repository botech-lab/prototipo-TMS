import { PAZAVI_TOKENS, PAZAVI_THEME } from './tokens';

describe('PAZAVI TMS Design Tokens (TDD Suite - Master Mother File)', () => {
  it('debe contener el objeto maestro PAZAVI_TOKENS con todas las ramas del sistema de diseño', () => {
    expect(PAZAVI_TOKENS).toBeDefined();
    expect(PAZAVI_TOKENS.colors).toBeDefined();
    expect(PAZAVI_TOKENS.colors.terracota).toBeDefined();
    expect(PAZAVI_TOKENS.colors.secondary).toBeDefined();
    expect(PAZAVI_TOKENS.colors.neutral).toBeDefined();
    expect(PAZAVI_TOKENS.colors.semantic).toBeDefined();
    expect(PAZAVI_TOKENS.typography).toBeDefined();
  });

  // ========================================================
  // 1. PALETA TERRACOTA (PRIMARIA)
  // ========================================================
  describe('1. Paleta Terracota (Color Primario)', () => {
    it('debe tener el Seed Value (500) en #B04E26', () => {
      expect(PAZAVI_TOKENS.colors.terracota[500].toUpperCase()).toBe('#B04E26');
    });

    it('debe tener los 9 niveles de escala de Terracota definidos con exactitud', () => {
      expect(PAZAVI_TOKENS.colors.terracota[50].toUpperCase()).toBe('#FBEDE6');
      expect(PAZAVI_TOKENS.colors.terracota[100].toUpperCase()).toBe('#F6D9CB');
      expect(PAZAVI_TOKENS.colors.terracota[200].toUpperCase()).toBe('#E7B9A4');
      expect(PAZAVI_TOKENS.colors.terracota[300].toUpperCase()).toBe('#E39873');
      expect(PAZAVI_TOKENS.colors.terracota[400].toUpperCase()).toBe('#D9784E');
      expect(PAZAVI_TOKENS.colors.terracota[600].toUpperCase()).toBe('#933F1D');
      expect(PAZAVI_TOKENS.colors.terracota[700].toUpperCase()).toBe('#7A3317');
      expect(PAZAVI_TOKENS.colors.terracota[800].toUpperCase()).toBe('#5E2710');
    });
  });

  // ========================================================
  // 2. PALETA AZUL ÍNDIGO AMBIENTAL (SECUNDARIA)
  // ========================================================
  describe('2. Paleta Azul Índigo Ambiental (Secundaria)', () => {
    it('debe tener el Seed Value (400) en #3F8FAE', () => {
      expect(PAZAVI_TOKENS.colors.secondary[400].toUpperCase()).toBe('#3F8FAE');
    });

    it('debe tener los 11 niveles de escala Índigo definidos', () => {
      expect(PAZAVI_TOKENS.colors.secondary[50].toUpperCase()).toBe('#E3F1F7');
      expect(PAZAVI_TOKENS.colors.secondary[100].toUpperCase()).toBe('#C4E2EF');
      expect(PAZAVI_TOKENS.colors.secondary[200].toUpperCase()).toBe('#9CCBDF');
      expect(PAZAVI_TOKENS.colors.secondary[300].toUpperCase()).toBe('#6FB2CF');
      expect(PAZAVI_TOKENS.colors.secondary[500].toUpperCase()).toBe('#1F6F8B');
      expect(PAZAVI_TOKENS.colors.secondary[600].toUpperCase()).toBe('#185A71');
      expect(PAZAVI_TOKENS.colors.secondary[700].toUpperCase()).toBe('#13485B');
      expect(PAZAVI_TOKENS.colors.secondary[800].toUpperCase()).toBe('#0E3746');
      expect(PAZAVI_TOKENS.colors.secondary[900].toUpperCase()).toBe('#08222C');
      expect(PAZAVI_TOKENS.colors.secondary[950].toUpperCase()).toBe('#04141A');
    });
  });

  // ========================================================
  // 3. PALETA NEUTRAL (SUPERFICIES, BORDES Y TEXTOS)
  // ========================================================
  describe('3. Paleta Neutral (Superficies, Bordes y Textos)', () => {
    it('debe tener neutral.0 en #FFFFFF y neutral.50 (Canvas) en #F4F3F1', () => {
      expect(PAZAVI_TOKENS.colors.neutral[0].toUpperCase()).toBe('#FFFFFF');
      expect(PAZAVI_TOKENS.colors.neutral[50].toUpperCase()).toBe('#F4F3F1');
    });

    it('debe tener la escala neutral completa hasta 950', () => {
      expect(PAZAVI_TOKENS.colors.neutral[100].toUpperCase()).toBe('#EFEEEB');
      expect(PAZAVI_TOKENS.colors.neutral[200].toUpperCase()).toBe('#E4E3DF');
      expect(PAZAVI_TOKENS.colors.neutral[300].toUpperCase()).toBe('#BDB8B1');
      expect(PAZAVI_TOKENS.colors.neutral[400].toUpperCase()).toBe('#8E8983');
      expect(PAZAVI_TOKENS.colors.neutral[500].toUpperCase()).toBe('#5F5A55');
      expect(PAZAVI_TOKENS.colors.neutral[600].toUpperCase()).toBe('#4E4A46');
      expect(PAZAVI_TOKENS.colors.neutral[700].toUpperCase()).toBe('#3A3734');
      expect(PAZAVI_TOKENS.colors.neutral[800].toUpperCase()).toBe('#262422');
      expect(PAZAVI_TOKENS.colors.neutral[900].toUpperCase()).toBe('#181716');
      expect(PAZAVI_TOKENS.colors.neutral[950].toUpperCase()).toBe('#0F0E0D');
    });
  });

  // ========================================================
  // 4. COLORES SEMÁNTICOS (ESTADOS Y VALIDACIÓN)
  // ========================================================
  describe('4. Colores Semánticos (Estados y Validación)', () => {
    it('debe tener SUCCESS (#E6F3EC, #2F7A55, #2F7A55)', () => {
      expect(PAZAVI_TOKENS.colors.semantic.success[100].toUpperCase()).toBe('#E6F3EC');
      expect(PAZAVI_TOKENS.colors.semantic.success[500].toUpperCase()).toBe('#2F7A55');
      expect(PAZAVI_TOKENS.colors.semantic.success[600].toUpperCase()).toBe('#2F7A55');
    });

    it('debe tener WARNING (#FBF0DC, #946009, #946009)', () => {
      expect(PAZAVI_TOKENS.colors.semantic.warning[100].toUpperCase()).toBe('#FBF0DC');
      expect(PAZAVI_TOKENS.colors.semantic.warning[500].toUpperCase()).toBe('#946009');
      expect(PAZAVI_TOKENS.colors.semantic.warning[600].toUpperCase()).toBe('#946009');
    });

    it('debe tener ERROR (#FCE9E7, #B42318, #B42318)', () => {
      expect(PAZAVI_TOKENS.colors.semantic.error[100].toUpperCase()).toBe('#FCE9E7');
      expect(PAZAVI_TOKENS.colors.semantic.error[500].toUpperCase()).toBe('#B42318');
      expect(PAZAVI_TOKENS.colors.semantic.error[600].toUpperCase()).toBe('#B42318');
    });

    it('debe tener INFO (#EFEEEB, #4E4A46, #4E4A46)', () => {
      expect(PAZAVI_TOKENS.colors.semantic.info[100].toUpperCase()).toBe('#EFEEEB');
      expect(PAZAVI_TOKENS.colors.semantic.info[500].toUpperCase()).toBe('#4E4A46');
      expect(PAZAVI_TOKENS.colors.semantic.info[600].toUpperCase()).toBe('#4E4A46');
    });
  });

  // ========================================================
  // 5. TIPOGRAFÍA OFICIAL (UI GENERAL Y DATOS CRÍTICOS)
  // ========================================================
  describe('5. Tipografía Oficial (Plus Jakarta Sans y DM Sans)', () => {
    it('debe definir Plus Jakarta Sans para UI General y DM Sans para Datos Críticos', () => {
      expect(PAZAVI_TOKENS.typography.fontFamily.ui).toContain('Plus Jakarta Sans');
      expect(PAZAVI_TOKENS.typography.fontFamily.data).toContain('DM Sans');
    });

    it('debe tener definidos los tokens de UI General', () => {
      expect(PAZAVI_TOKENS.typography.ui.headingLarge.fontSize).toBe('32px');
      expect(PAZAVI_TOKENS.typography.ui.headingLarge.fontWeight).toBe('700');
      expect(PAZAVI_TOKENS.typography.ui.bodyBase.fontSize).toBe('14px');
    });

    it('debe tener definidos los tokens de Datos Críticos', () => {
      expect(PAZAVI_TOKENS.typography.data.pricePrimary.fontSize).toBe('24px');
      expect(PAZAVI_TOKENS.typography.data.pricePrimary.color.toUpperCase()).toBe('#B04E26');
      expect(PAZAVI_TOKENS.typography.data.idCode.color.toUpperCase()).toBe('#3A3734');
      expect(PAZAVI_TOKENS.typography.data.timeDisplay.fontSize).toBe('30px');
    });
  });

  describe('Escalas de espacio y tipografía', () => {
    it('el espaciado sigue la base de 4px', () => {
      Object.values(PAZAVI_TOKENS.space).forEach(v => expect(parseInt(v, 10) % 4).toBe(0));
    });

    it('ningún tamaño de texto baja de 11px', () => {
      Object.values(PAZAVI_TOKENS.textScale).forEach(v => expect(parseInt(v, 10)).toBeGreaterThanOrEqual(11));
    });
  });
});

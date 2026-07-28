import { toolLabel } from './toolLabels';

describe('toolLabel', () => {
  describe('the explicit table — the copy the deck specifies', () => {
    it.each([
      ['get_all_agents_status', 'Reading agent logs'],
      ['get_analytics_dashboard', 'Pulling analytics'],
      ['list_escalations', 'Checking escalation queue'],
      ['get_campaign_analytics', 'Reading campaign data'],
      ['search_knowledge_base', 'Searching the knowledge base'],
      ['approve_human_takeover', 'Approving human takeover'],
      ['create_agent', 'Creating the agent'],
    ])('%s → %s', (name, expected) => {
      expect(toolLabel(name)).toBe(expected);
    });

    it('matches the table regardless of the case the backend sends', () => {
      expect(toolLabel('GET_ALL_AGENTS_STATUS')).toBe('Reading agent logs');
      expect(toolLabel('  list_escalations  ')).toBe('Checking escalation queue');
    });
  });

  describe('the fallback — an unknown tool still reads as a phrase', () => {
    it('never leaks a raw snake_case name', () => {
      expect(toolLabel('get_foo_bar')).not.toContain('_');
      expect(toolLabel('get_foo_bar')).toBe('Reading foo bar');
    });

    it.each([
      ['get_widget_inventory', 'Reading widget inventory'],
      ['list_shipping_zones', 'Listing shipping zones'],
      ['search_invoices', 'Searching invoices'],
      ['create_webhook', 'Creating webhook'],
      ['update_billing_profile', 'Updating billing profile'],
      ['delete_saved_view', 'Deleting saved view'],
      ['uninstall_theme', 'Removing theme'],
      ['schedule_report_delivery', 'Scheduling report delivery'],
    ])('%s → %s', (name, expected) => {
      expect(toolLabel(name)).toBe(expected);
    });

    it('handles a kebab-case name', () => {
      expect(toolLabel('get-billing-summary')).toBe('Reading billing summary');
    });

    it('handles a camelCase name', () => {
      expect(toolLabel('getWidgetInventory')).toBe('Reading widget inventory');
      expect(toolLabel('listShippingZones')).toBe('Listing shipping zones');
    });

    it('keeps an unrecognised verb rather than dropping the only meaningful word', () => {
      expect(toolLabel('frobnicate_widget_state')).toBe('Frobnicate widget state');
      expect(toolLabel('reconcile_ledger')).toBe('Reconcile ledger');
    });

    it('handles a bare verb with nothing after it', () => {
      expect(toolLabel('list')).toBe('Listing');
      expect(toolLabel('get')).toBe('Reading');
    });

    it('handles a single non-verb word', () => {
      expect(toolLabel('escalations')).toBe('Escalations');
    });

    it('always starts with a capital letter', () => {
      for (const name of ['get_foo', 'frobnicate_bar', 'zzz_qqq', 'widget']) {
        expect(toolLabel(name)[0]).toBe(toolLabel(name)[0].toUpperCase());
      }
    });
  });

  describe('already-humanised input', () => {
    it('passes a phrase through untouched', () => {
      expect(toolLabel('Reading agent logs')).toBe('Reading agent logs');
      expect(toolLabel('Preparing recommendation')).toBe('Preparing recommendation');
    });

    it('capitalises a lowercase phrase', () => {
      expect(toolLabel('reading agent logs')).toBe('Reading agent logs');
    });

    it('collapses runaway whitespace', () => {
      expect(toolLabel('reading   agent  logs')).toBe('Reading agent logs');
    });
  });

  describe('edge cases', () => {
    it.each([
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['undefined', undefined],
      ['null', null],
    ])('%s falls back to the in-flight placeholder', (_label, input) => {
      // A tool_call delta can arrive before its name has finished streaming;
      // the panel must still have a row to render.
      expect(toolLabel(input)).toBe('Working');
    });

    it('falls back when the name is only separators', () => {
      expect(toolLabel('___')).toBe('Working');
    });

    it('never returns an empty string', () => {
      for (const name of ['', ' ', '_', 'a', 'get', 'get_', 'GET__X']) {
        expect(toolLabel(name).length).toBeGreaterThan(0);
      }
    });
  });
});

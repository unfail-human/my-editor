/* MY EDITOR V124 — disable unintended one-column CSS multicol overflow */
(() => {
  function install(){
    if (document.documentElement.dataset.v124Installed === '1') return;
    document.documentElement.dataset.v124Installed = '1';

    const original = window.applyDocumentLayoutToElement;
    if (typeof original === 'function') {
      window.applyDocumentLayoutToElement = function(paper, editor, title, subtitle, pageIndex, layout){
        const result = original.apply(this, arguments);
        try {
          const activeLayout = layout || (typeof currentLayout === 'function' ? currentLayout() : null);
          const vertical = activeLayout?.writingMode === 'vertical';
          const columns = vertical ? 1 : Math.max(1, Number(activeLayout?.columns || 1));

          /* column-count:1 on a fixed-height editable creates horizontal overflow columns.
             For a normal one-column page, multicol must be completely disabled. */
          if (!vertical && columns <= 1) {
            editor.style.setProperty('column-count', 'auto', 'important');
            editor.style.setProperty('column-width', 'auto', 'important');
            editor.style.removeProperty('column-fill');
            editor.classList.remove('layout-columns');
          } else if (!vertical && columns > 1) {
            editor.style.setProperty('column-count', String(columns), 'important');
            editor.style.setProperty('column-width', 'auto', 'important');
            editor.classList.add('layout-columns');
          }
        } catch (e) {
          console.error('V124 column fix failed', e);
        }
        return result;
      };
    }

    function repairLiveEditor(){
      const editor = document.getElementById('editor');
      if (!editor) return;
      try {
        const layout = typeof currentLayout === 'function' ? currentLayout() : null;
        const vertical = layout?.writingMode === 'vertical';
        const columns = vertical ? 1 : Math.max(1, Number(layout?.columns || 1));
        if (!vertical && columns <= 1) {
          editor.style.setProperty('column-count', 'auto', 'important');
          editor.style.setProperty('column-width', 'auto', 'important');
          editor.style.removeProperty('column-fill');
          editor.classList.remove('layout-columns');
        }
      } catch {}
    }

    repairLiveEditor();
    requestAnimationFrame(repairLiveEditor);
    setTimeout(() => {
      repairLiveEditor();
      try { window.reflowDocumentV121?.({keepCaret:false}); }
      catch (e) { console.error('V124 reflow failed', e); }
    }, 250);

    document.addEventListener('change', e => {
      if (e.target?.id === 'columnCount' || e.target?.id === 'writingMode') {
        setTimeout(() => {
          try { window.applyDocumentLayout?.(); } catch {}
          repairLiveEditor();
          try { window.reflowDocumentV121?.({keepCaret:false}); } catch {}
        }, 0);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(install, 0), {once:true});
  } else setTimeout(install, 0);
})();

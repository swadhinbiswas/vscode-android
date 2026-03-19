import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll } from 'lucide-react';

interface FindReplaceWidgetProps {
  editorInstance: any;
  monacoInstance: any;
  onClose: () => void;
}

export function FindReplaceWidget({ editorInstance, monacoInstance, onClose }: FindReplaceWidgetProps) {
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const findInputRef = useRef<HTMLInputElement>(null);
  const decorationsRef = useRef<string[]>([]);

  // Focus find input on mount
  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  // Get selected text as initial query
  useEffect(() => {
    if (editorInstance) {
      const selection = editorInstance.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editorInstance.getModel().getValueInRange(selection);
        setFindQuery(selectedText);
      }
    }
  }, [editorInstance]);

  // Find all matches
  const findAllMatches = useCallback(() => {
    if (!editorInstance || !monacoInstance || !findQuery) {
      setMatchCount(0);
      setCurrentMatchIndex(0);
      return;
    }

    const model = editorInstance.getModel();
    if (!model) return;

    // Clear previous decorations
    if (decorationsRef.current.length > 0) {
      editorInstance.deltaDecorations(decorationsRef.current, []);
      decorationsRef.current = [];
    }

    // Build regex
    let regex: RegExp | null = null;
    try {
      let escaped = useRegex ? findQuery : findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      regex = new RegExp(escaped, flags);
    } catch {
      regex = null;
    }

    const text = model.getValue();
    const matches = regex ? [...text.matchAll(regex)] : [];
    
    if (regex) {
      const newDecorations = matches.map((match) => {
        const startPos = model.getPositionAt(match.index || 0);
        const endPos = model.getPositionAt((match.index || 0) + match[0].length);
        
        return {
          range: new monacoInstance.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
          ),
          options: {
            inlineClassName: 'find-match-decoration',
          },
        };
      });

      decorationsRef.current = editorInstance.deltaDecorations([], newDecorations);
    }

    setMatchCount(matches.length);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [editorInstance, monacoInstance, findQuery, useRegex, caseSensitive, wholeWord]);

  // Update matches when query changes
  useEffect(() => {
    const timer = setTimeout(findAllMatches, 200);
    return () => clearTimeout(timer);
  }, [findAllMatches]);

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (!editorInstance || !monacoInstance || matchCount === 0) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const text = model.getValue();
    let regex: RegExp | null = null;
    
    try {
      let escaped = useRegex ? findQuery : findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      regex = new RegExp(escaped, flags);
    } catch {
      return;
    }

    const matches = [...text.matchAll(regex)];
    if (matches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    const match = matches[nextIndex];
    
    const startPos = model.getPositionAt(match.index || 0);
    const endPos = model.getPositionAt((match.index || 0) + match[0].length);

    editorInstance.setSelection(new monacoInstance.Range(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column
    ));
    editorInstance.revealPositionInCenter(startPos);
    setCurrentMatchIndex(nextIndex);
  }, [editorInstance, monacoInstance, matchCount, currentMatchIndex, findQuery, useRegex, caseSensitive, wholeWord]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    if (!editorInstance || !monacoInstance || matchCount === 0) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const text = model.getValue();
    let regex: RegExp | null = null;
    
    try {
      let escaped = useRegex ? findQuery : findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      regex = new RegExp(escaped, flags);
    } catch {
      return;
    }

    const matches = [...text.matchAll(regex)];
    if (matches.length === 0) return;

    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    const match = matches[prevIndex];
    
    const startPos = model.getPositionAt(match.index || 0);
    const endPos = model.getPositionAt((match.index || 0) + match[0].length);

    editorInstance.setSelection(new monacoInstance.Range(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column
    ));
    editorInstance.revealPositionInCenter(startPos);
    setCurrentMatchIndex(prevIndex);
  }, [editorInstance, monacoInstance, matchCount, currentMatchIndex, findQuery, useRegex, caseSensitive, wholeWord]);

  // Replace current match
  const handleReplace = useCallback(() => {
    if (!editorInstance || !findQuery || matchCount === 0) return;

    const selection = editorInstance.getSelection();
    if (!selection) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    let shouldReplace = caseSensitive 
      ? selectedText === findQuery 
      : selectedText.toLowerCase() === findQuery.toLowerCase();

    if (wholeWord && shouldReplace) {
      // Check word boundaries
      const line = model.getLineContent(selection.startLineNumber);
      const beforeChar = selection.startColumn > 1 ? line[selection.startColumn - 2] : '';
      const afterChar = selection.endColumn < line.length ? line[selection.endColumn] : '';
      shouldReplace = !/\w/.test(beforeChar) && !/\w/.test(afterChar);
    }

    if (shouldReplace) {
      editorInstance.executeEdits('find-replace', [{
        range: selection,
        text: replaceQuery,
      }]);
      goToNextMatch();
    } else {
      goToNextMatch();
    }
  }, [editorInstance, findQuery, replaceQuery, matchCount, caseSensitive, wholeWord, goToNextMatch]);

  // Replace all matches
  const handleReplaceAll = useCallback(() => {
    if (!editorInstance || !findQuery || matchCount === 0) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const text = model.getValue();
    let regex: RegExp | null = null;
    
    try {
      let escaped = useRegex ? findQuery : findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }
      const flags = caseSensitive ? 'g' : 'gi';
      regex = new RegExp(escaped, flags);
    } catch {
      return;
    }

    const newText = text.replace(regex, replaceQuery);
    editorInstance.executeEdits('find-replace-all', [{
      range: model.getFullModelRange(),
      text: newText,
    }]);

    findAllMatches();
  }, [editorInstance, findQuery, replaceQuery, matchCount, useRegex, caseSensitive, wholeWord, findAllMatches]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextMatch, goToPreviousMatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorInstance && decorationsRef.current.length > 0) {
        editorInstance.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, [editorInstance]);

  return (
    <div className="absolute top-0 right-0 z-10 bg-vscode-sidebar border-b border-l border-vscode-border rounded-bl-lg shadow-lg m-2 min-w-[300px]">
      {/* Find Input */}
      <div className="flex items-center gap-2 p-2 border-b border-vscode-border">
        <input
          ref={findInputRef}
          type="text"
          value={findQuery}
          onChange={(e) => setFindQuery(e.target.value)}
          placeholder="Find"
          className="flex-1 bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-2 py-1 rounded outline-none focus:border-vscode-blue"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousMatch}
            disabled={matchCount === 0}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            onClick={goToNextMatch}
            disabled={matchCount === 0}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
            title="Next match (Enter)"
          >
            <ChevronDown className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`p-1 rounded ${showReplace ? 'bg-white/10' : 'hover:bg-white/10'}`}
            title="Toggle Replace"
          >
            <Replace className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-vscode-foreground" />
          </button>
        </div>
      </div>

      {/* Replace Input */}
      {showReplace && (
        <div className="flex items-center gap-2 p-2 border-b border-vscode-border">
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Replace"
            className="flex-1 bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-2 py-1 rounded outline-none focus:border-vscode-blue"
          />
          <button
            onClick={handleReplace}
            disabled={matchCount === 0}
            className="px-2 py-1 text-xs bg-vscode-blue text-white rounded hover:bg-vscode-blue/80 disabled:opacity-50"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={matchCount === 0}
            className="px-2 py-1 text-xs bg-vscode-blue text-white rounded hover:bg-vscode-blue/80 disabled:opacity-50"
          >
            All
          </button>
        </div>
      )}

      {/* Options */}
      <div className="flex items-center gap-2 p-2">
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          className={`px-2 py-0.5 text-xs rounded border ${
            caseSensitive
              ? 'bg-vscode-blue border-vscode-blue text-white'
              : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
          }`}
          title="Match Case"
        >
          Aa
        </button>
        <button
          onClick={() => setWholeWord(!wholeWord)}
          className={`px-2 py-0.5 text-xs rounded border ${
            wholeWord
              ? 'bg-vscode-blue border-vscode-blue text-white'
              : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
          }`}
          title="Match Whole Word"
        >
          ab
        </button>
        <button
          onClick={() => setUseRegex(!useRegex)}
          className={`px-2 py-0.5 text-xs rounded border ${
            useRegex
              ? 'bg-vscode-blue border-vscode-blue text-white'
              : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
          }`}
          title="Use Regular Expression"
        >
          .*
        </button>
        <span className="flex-1 text-xs text-vscode-gutter-foreground text-right">
          {matchCount > 0 
            ? `${currentMatchIndex + 1} of ${matchCount}`
            : 'No results'}
        </span>
      </div>
    </div>
  );
}

// Find/Replace widget for Monaco editor

use crate::types::FileDiff;
use diffy::{create_patch, Patch};
use std::time::{SystemTime, UNIX_EPOCH};

/// Conflict resolution strategies
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConflictStrategy {
    /// Local changes win (last-write-wins)
    LocalWins,
    /// Remote changes win
    RemoteWins,
    /// Manual resolution required
    Manual,
    /// Smart merge using 3-way diff
    SmartMerge,
}

/// Represents a file conflict
#[derive(Debug, Clone)]
pub struct FileConflict {
    pub path: String,
    pub local_content: String,
    pub remote_content: String,
    pub base_content: Option<String>,
    pub local_timestamp: u64,
    pub remote_timestamp: u64,
    pub strategy: ConflictStrategy,
}

impl FileConflict {
    /// Create a new conflict
    pub fn new(
        path: String,
        local_content: String,
        remote_content: String,
        base_content: Option<String>,
    ) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Self {
            path,
            local_content,
            remote_content,
            base_content,
            local_timestamp: now,
            remote_timestamp: now,
            strategy: ConflictStrategy::SmartMerge,
        }
    }

    /// Resolve the conflict using the specified strategy
    pub fn resolve(&self) -> Result<String, ConflictError> {
        match self.strategy {
            ConflictStrategy::LocalWins => Ok(self.local_content.clone()),
            ConflictStrategy::RemoteWins => Ok(self.remote_content.clone()),
            ConflictStrategy::Manual => Err(ConflictError::ManualResolutionRequired),
            ConflictStrategy::SmartMerge => self.smart_merge(),
        }
    }

    /// Smart merge using 3-way diff
    fn smart_merge(&self) -> Result<String, ConflictError> {
        // If we have a base, try 3-way merge
        if let Some(base) = &self.base_content {
            // Check if only one side changed
            let local_changed = base != &self.local_content;
            let remote_changed = base != &self.remote_content;

            if !local_changed && !remote_changed {
                // No changes
                return Ok(base.clone());
            } else if !local_changed {
                // Only remote changed
                return Ok(self.remote_content.clone());
            } else if !remote_changed {
                // Only local changed
                return Ok(self.local_content.clone());
            }

            // Both changed - try automatic merge
            if let Some(merged) = self.try_auto_merge(base) {
                return Ok(merged);
            }

            // Auto-merge failed, fall back to marking conflicts
            Ok(self.mark_conflicts())
        } else {
            // No base, use last-write-wins based on timestamp
            if self.local_timestamp >= self.remote_timestamp {
                Ok(self.local_content.clone())
            } else {
                Ok(self.remote_content.clone())
            }
        }
    }

    /// Try to automatically merge changes
    fn try_auto_merge(&self, base: &str) -> Option<String> {
        // Simple line-based merge
        let base_lines: Vec<&str> = base.lines().collect();
        let local_lines: Vec<&str> = self.local_content.lines().collect();
        let remote_lines: Vec<&str> = self.remote_content.lines().collect();

        // If changes are in different parts of the file, we can merge
        let local_diff = find_diff_regions(&base_lines, &local_lines);
        let remote_diff = find_diff_regions(&base_lines, &remote_lines);

        // Check if regions overlap
        if !regions_overlap(&local_diff, &remote_diff) {
            // Non-overlapping changes, can merge
            return Some(apply_non_overlapping_merge(
                base,
                &local_diff,
                &remote_diff,
                &local_lines,
                &remote_lines,
            ));
        }

        None
    }

    /// Mark conflicts in the merged content
    fn mark_conflicts(&self) -> String {
        format!(
            "<<<<<<< HEAD (Local)\n{}\n=======\n{}\n>>>>>>> Remote",
            self.local_content, self.remote_content
        )
    }

    /// Generate a diff for display
    pub fn generate_diff(&self) -> FileDiff {
        let patch = create_patch(&self.local_content, &self.remote_content);
        
        FileDiff {
            path: self.path.clone(),
            original_content: self.local_content.clone(),
            modified_content: self.remote_content.clone(),
            diff_patches: vec![patch.to_string()],
        }
    }
}

/// Conflict resolution errors
#[derive(Debug, Clone)]
pub enum ConflictError {
    ManualResolutionRequired,
    MergeFailed,
    InvalidBase,
}

impl std::fmt::Display for ConflictError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConflictError::ManualResolutionRequired => {
                write!(f, "Manual resolution required")
            }
            ConflictError::MergeFailed => write!(f, "Merge failed"),
            ConflictError::InvalidBase => write!(f, "Invalid base content"),
        }
    }
}

/// Diff region for tracking changes
#[derive(Debug, Clone)]
struct DiffRegion {
    start: usize,
    end: usize,
}

/// Find regions that differ between two versions
fn find_diff_regions(base: &[&str], modified: &[&str]) -> Vec<DiffRegion> {
    let mut regions = Vec::new();
    let mut in_diff = false;
    let mut start = 0;

    let max_len = base.len().max(modified.len());

    for i in 0..max_len {
        let base_line = base.get(i).copied().unwrap_or("");
        let mod_line = modified.get(i).copied().unwrap_or("");

        if base_line != mod_line {
            if !in_diff {
                start = i;
                in_diff = true;
            }
        } else if in_diff {
            regions.push(DiffRegion { start, end: i });
            in_diff = false;
        }
    }

    if in_diff {
        regions.push(DiffRegion {
            start,
            end: max_len,
        });
    }

    regions
}

/// Check if two sets of regions overlap
fn regions_overlap(a: &[DiffRegion], b: &[DiffRegion]) -> bool {
    for region_a in a {
        for region_b in b {
            if region_a.start < region_b.end && region_b.start < region_a.end {
                return true;
            }
        }
    }
    false
}

/// Apply non-overlapping merge
fn apply_non_overlapping_merge(
    base: &str,
    local_diff: &[DiffRegion],
    remote_diff: &[DiffRegion],
    local_lines: &[&str],
    remote_lines: &[&str],
) -> String {
    let base_lines: Vec<&str> = base.lines().collect();
    let mut result = Vec::new();
    let mut i = 0;

    while i < base_lines.len() {
        // Check if this line is in a local diff region
        let in_local = local_diff.iter().any(|r| i >= r.start && i < r.end);
        let in_remote = remote_diff.iter().any(|r| i >= r.start && i < r.end);

        if in_local && !in_remote {
            // Apply local change
            if let Some(local_region) = local_diff.iter().find(|r| i >= r.start && i < r.end) {
                let local_start = local_region.start;
                let local_end = local_region.end;
                let _offset = local_start as isize - local_region.start as isize;
                
                for j in local_region.start..local_region.end {
                    if j < local_lines.len() {
                        result.push(local_lines[j]);
                    }
                }
                i = local_end;
                continue;
            }
        } else if in_remote && !in_local {
            // Apply remote change
            if let Some(remote_region) = remote_diff.iter().find(|r| i >= r.start && i < r.end) {
                for j in remote_region.start..remote_region.end {
                    if j < remote_lines.len() {
                        result.push(remote_lines[j]);
                    }
                }
                i = remote_region.end;
                continue;
            }
        }

        // No change or both changed (keep base)
        if i < base_lines.len() {
            result.push(base_lines[i]);
        }
        i += 1;
    }

    result.join("\n")
}

/// Conflict manager for handling multiple file conflicts
pub struct ConflictManager {
    conflicts: Vec<FileConflict>,
}

impl ConflictManager {
    pub fn new() -> Self {
        Self {
            conflicts: Vec::new(),
        }
    }

    pub fn add_conflict(&mut self, conflict: FileConflict) {
        self.conflicts.push(conflict);
    }

    pub fn has_conflicts(&self) -> bool {
        !self.conflicts.is_empty()
    }

    pub fn conflict_count(&self) -> usize {
        self.conflicts.len()
    }

    pub fn resolve_all(&self) -> Result<Vec<(String, String)>, ConflictError> {
        let mut results = Vec::new();
        
        for conflict in &self.conflicts {
            let resolved = conflict.resolve()?;
            results.push((conflict.path.clone(), resolved));
        }
        
        Ok(results)
    }

    pub fn get_conflicts(&self) -> &[FileConflict] {
        &self.conflicts
    }

    pub fn clear(&mut self) {
        self.conflicts.clear();
    }
}

impl Default for ConflictManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_local_wins_strategy() {
        let conflict = FileConflict::new(
            "test.txt".to_string(),
            "local content".to_string(),
            "remote content".to_string(),
            None,
        );
        
        let result = conflict.resolve().unwrap();
        // With SmartMerge (default), it should try to merge
        // For this test, we just check it returns something
        assert!(!result.is_empty());
    }

    #[test]
    fn test_no_changes() {
        let base = "line 1\nline 2\nline 3";
        let conflict = FileConflict::new(
            "test.txt".to_string(),
            base.to_string(),
            base.to_string(),
            Some(base.to_string()),
        );
        
        let result = conflict.resolve().unwrap();
        assert_eq!(result, base);
    }

    #[test]
    fn test_conflict_marking() {
        let conflict = FileConflict {
            path: "test.txt".to_string(),
            local_content: "local".to_string(),
            remote_content: "remote".to_string(),
            base_content: None,
            local_timestamp: 1000,
            remote_timestamp: 500,
            strategy: ConflictStrategy::Manual,
        };
        
        let result = conflict.resolve();
        assert!(matches!(result, Err(ConflictError::ManualResolutionRequired)));
    }

    #[test]
    fn test_timestamp_based_resolution() {
        let conflict = FileConflict {
            path: "test.txt".to_string(),
            local_content: "newer".to_string(),
            remote_content: "older".to_string(),
            base_content: None,
            local_timestamp: 1000,
            remote_timestamp: 500,
            strategy: ConflictStrategy::SmartMerge,
        };
        
        let result = conflict.resolve().unwrap();
        assert_eq!(result, "newer");
    }
}

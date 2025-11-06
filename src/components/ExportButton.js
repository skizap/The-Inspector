import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';

/**
 * Provides export functionality for package analysis reports in Markdown and PDF formats
 * @param {Object} report - Unified report object from inspector.js with all analysis data
 * @returns {JSX.Element} The export button component with dropdown menu
 * @example
 * <ExportButton report={report} />
 */
function ExportButton({ report }) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const firstMenuItemRef = useRef(null);

  /**
   * Escapes special Markdown characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  const escapeMarkdown = (text) => {
    if (!text) return '';
    return text.replace(/([*_~`\[\]()#>\\])/g, '\\$1');
  };

  /**
   * Generates Markdown formatted report
   * @param {Object} report - Unified report object
   * @returns {string} Markdown formatted report
   */
  const _generateMarkdown = (report) => {
    const packageName = escapeMarkdown(report.packageInfo?.name || 'Unknown Package');
    const version = escapeMarkdown(report.packageInfo?.version || '0.0.0');
    const description = escapeMarkdown(report.packageInfo?.description || 'No description available');
    const license = escapeMarkdown(report.packageInfo?.license || 'Unknown');
    const maintainers = report.packageInfo?.maintainers?.length || 0;
    const timestamp = report.metadata?.analyzedAt || new Date().toISOString();
    const totalDeps = report.dependencyTree?.total || 0;
    const dependencies = report.dependencyTree?.direct || [];
    const vulnCount = Array.isArray(report.vulnerabilities) ? report.vulnerabilities.length : 0;
    const vulnsBySeverity = report.vulnerabilitiesBySeverity || {};

    let markdown = `# Package Analysis Report: ${packageName}\n\n`;
    markdown += `**Version:** ${version}\n`;
    markdown += `**Analyzed:** ${new Date(timestamp).toLocaleString()}\n\n`;
    
    markdown += `## Package Information\n\n`;
    markdown += `- **Description:** ${description}\n`;
    markdown += `- **License:** ${license}\n`;
    markdown += `- **Maintainers:** ${maintainers}\n\n`;
    
    markdown += `## Dependencies\n\n`;
    markdown += `**Total:** ${totalDeps}\n\n`;
    if (dependencies.length > 0) {
      dependencies.forEach(dep => {
        markdown += `- \`${escapeMarkdown(dep)}\`\n`;
      });
    } else {
      markdown += `No dependencies (standalone package)\n`;
    }
    markdown += `\n`;
    
    markdown += `## Security Vulnerabilities\n\n`;
    markdown += `**Total:** ${vulnCount}\n\n`;
    
    if (vulnCount === 0) {
      markdown += `✓ No known vulnerabilities found\n\n`;
    } else {
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const vulns = vulnsBySeverity[severity] || [];
        if (vulns.length > 0) {
          markdown += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${vulns.length})\n\n`;
          vulns.forEach(vuln => {
            const vulnId = escapeMarkdown(vuln.id || 'Unknown ID');
            const vulnPackage = escapeMarkdown(vuln.package || 'Unknown package');
            const vulnSummary = escapeMarkdown(vuln.summary || 'No summary available');
            markdown += `- **${vulnId}** - ${vulnPackage}\n`;
            markdown += `  - ${vulnSummary}\n`;
            if (vuln.cvssScore) {
              markdown += `  - CVSS: ${vuln.cvssScore}\n`;
            }
          });
          markdown += `\n`;
        }
      });
    }
    
    markdown += `## AI-Powered Analysis\n\n`;
    if (!report.aiSummary) {
      markdown += `AI analysis unavailable. Manual review recommended.\n\n`;
    } else {
      markdown += `**Risk Level:** ${escapeMarkdown(report.aiSummary.riskLevel || 'Unknown')}\n\n`;
      
      if (report.aiSummary.concerns && report.aiSummary.concerns.length > 0) {
        markdown += `### Key Concerns\n\n`;
        report.aiSummary.concerns.forEach(concern => {
          markdown += `- ${escapeMarkdown(concern)}\n`;
        });
        markdown += `\n`;
      }
      
      if (report.aiSummary.recommendations && report.aiSummary.recommendations.length > 0) {
        markdown += `### Recommendations\n\n`;
        report.aiSummary.recommendations.forEach(rec => {
          markdown += `- ${escapeMarkdown(rec)}\n`;
        });
        markdown += `\n`;
      }
      
      if (report.aiSummary.complexityAssessment) {
        markdown += `### Complexity Assessment\n\n`;
        markdown += `${escapeMarkdown(report.aiSummary.complexityAssessment)}\n\n`;
      }
    }
    
    return markdown;
  };

  /**
   * Generates PDF document
   * @param {Object} report - Unified report object
   * @returns {jsPDF} PDF document object
   */
  const _generatePDF = (report) => {
    const doc = new jsPDF();
    let y = 20;
    const lineHeight = 7;
    const maxWidth = 170;

    // Helper to check page break
    const checkPageBreak = (neededSpace = 10) => {
      if (y + neededSpace > 280) {
        doc.addPage();
        y = 20;
      }
    };

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Package Analysis Report', 20, y);
    y += 15;

    // Package name
    doc.setFontSize(16);
    doc.text(report.packageInfo?.name || 'Unknown Package', 20, y);
    y += 10;

    // Package Information
    doc.setFontSize(14);
    doc.text('Package Information', 20, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Version: ${report.packageInfo?.version || '0.0.0'}`, 20, y);
    y += lineHeight;
    doc.text(`License: ${report.packageInfo?.license || 'Unknown'}`, 20, y);
    y += lineHeight;
    doc.text(`Maintainers: ${report.packageInfo?.maintainers?.length || 0}`, 20, y);
    y += lineHeight;
    
    const description = report.packageInfo?.description || 'No description available';
    const descLines = doc.splitTextToSize(description, maxWidth);
    doc.text(descLines, 20, y);
    y += descLines.length * lineHeight + 5;

    // Dependencies
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Dependencies', 20, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total: ${report.dependencyTree?.total || 0}`, 20, y);
    y += lineHeight + 5;

    // Vulnerabilities
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Security Vulnerabilities', 20, y);
    y += 10;

    const vulnCount = Array.isArray(report.vulnerabilities) ? report.vulnerabilities.length : 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total: ${vulnCount}`, 20, y);
    y += lineHeight + 5;

    if (vulnCount > 0) {
      const vulnsBySeverity = report.vulnerabilitiesBySeverity || {};
      ['critical', 'high', 'medium', 'low'].forEach(severity => {
        const vulns = vulnsBySeverity[severity] || [];
        if (vulns.length > 0) {
          checkPageBreak(15);
          
          // Set color based on severity
          if (severity === 'critical') doc.setTextColor(220, 38, 38);
          else if (severity === 'high') doc.setTextColor(234, 88, 12);
          else if (severity === 'medium') doc.setTextColor(202, 138, 4);
          else if (severity === 'low') doc.setTextColor(37, 99, 235);
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${severity.charAt(0).toUpperCase() + severity.slice(1)} (${vulns.length})`, 20, y);
          y += lineHeight;
          
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          
          vulns.slice(0, 3).forEach(vuln => {
            checkPageBreak(15);
            const vulnText = `${vuln.id || 'Unknown'} - ${vuln.package || 'Unknown'}`;
            doc.text(vulnText, 25, y);
            y += lineHeight;
          });
          
          if (vulns.length > 3) {
            doc.text(`... and ${vulns.length - 3} more`, 25, y);
            y += lineHeight;
          }
          y += 3;
        }
      });
    } else {
      doc.text('✓ No known vulnerabilities found', 20, y);
      y += lineHeight + 5;
    }

    // AI Summary
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AI-Powered Analysis', 20, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    if (!report.aiSummary) {
      doc.text('AI analysis unavailable. Manual review recommended.', 20, y);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(`Risk Level: ${report.aiSummary.riskLevel || 'Unknown'}`, 20, y);
      y += lineHeight + 5;
      
      if (report.aiSummary.concerns && report.aiSummary.concerns.length > 0) {
        checkPageBreak(15);
        doc.text('Key Concerns:', 20, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        report.aiSummary.concerns.slice(0, 3).forEach(concern => {
          checkPageBreak(10);
          const concernLines = doc.splitTextToSize(`• ${concern}`, maxWidth - 5);
          doc.text(concernLines, 25, y);
          y += concernLines.length * lineHeight;
        });
        y += 3;
      }
      
      if (report.aiSummary.recommendations && report.aiSummary.recommendations.length > 0) {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.text('Recommendations:', 20, y);
        y += lineHeight;
        doc.setFont('helvetica', 'normal');
        report.aiSummary.recommendations.slice(0, 3).forEach(rec => {
          checkPageBreak(10);
          const recLines = doc.splitTextToSize(`• ${rec}`, maxWidth - 5);
          doc.text(recLines, 25, y);
          y += recLines.length * lineHeight;
        });
      }
    }

    return doc;
  };

  /**
   * Handles Markdown export
   */
  const handleExportMarkdown = () => {
    try {
      setIsExporting(true);
      const markdown = _generateMarkdown(report);
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.packageInfo?.name || 'package'}-analysis.md`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('[ExportButton] Exported Markdown for:', report.packageInfo?.name);
    } catch (error) {
      console.error('[ExportButton] Markdown export failed:', error);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  /**
   * Handles PDF export
   */
  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      const doc = _generatePDF(report);
      doc.save(`${report.packageInfo?.name || 'package'}-analysis.pdf`);
      console.log('[ExportButton] Exported PDF for:', report.packageInfo?.name);
    } catch (error) {
      console.error('[ExportButton] PDF export failed:', error);
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  /**
   * Toggles dropdown menu
   */
  const toggleMenu = () => {
    const newShowMenu = !showMenu;
    setShowMenu(newShowMenu);
    
    // Move focus to first menu item when opening
    if (newShowMenu) {
      setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 0);
    }
  };

  /**
   * Closes menu and restores focus to toggle button
   */
  const closeMenu = () => {
    setShowMenu(false);
    buttonRef.current?.focus();
  };

  // Handle outside clicks and Escape key
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu]);

  return (
    <div className="export-button-container">
      <button
        ref={buttonRef}
        className="export-button"
        onClick={toggleMenu}
        disabled={isExporting}
        aria-label="Export report"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        {isExporting ? 'Exporting...' : 'Export Report ▼'}
      </button>
      
      {showMenu && (
        <div ref={menuRef} className="export-menu" role="menu">
          <button 
            ref={firstMenuItemRef}
            onClick={handleExportMarkdown} 
            role="menuitem"
          >
            📄 Export as Markdown
          </button>
          <button onClick={handleExportPDF} role="menuitem">
            📑 Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;

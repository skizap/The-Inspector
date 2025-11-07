import React from 'react';
import DependencyTree from './DependencyTree';
import ExportButton from './ExportButton';
import '../styles/nutrition-label.css';

/**
 * Displays comprehensive package analysis report in a nutrition label format
 * @param {Object} report - Unified report object from inspector.js with packageInfo, dependencyTree, vulnerabilities, vulnerabilitiesBySeverity, aiSummary, metadata
 * @returns {JSX.Element} The nutrition label component
 * @example
 * <NutritionLabel report={reportObject} />
 */
function NutritionLabel({ report }) {
  // Helper functions
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAnalysisTime = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    if (milliseconds < 1000) {
      return `${milliseconds} milliseconds`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)} seconds`;
    } else {
      return `${(milliseconds / 60000).toFixed(1)} minutes`;
    }
  };

  const getSeverityColor = (severity) => {
    const severityLower = (severity || '').toLowerCase();
    switch (severityLower) {
      case 'critical':
        return 'var(--color-critical)';
      case 'high':
        return 'var(--color-high)';
      case 'medium':
        return 'var(--color-medium)';
      case 'low':
        return 'var(--color-low)';
      default:
        return 'var(--color-secondary)';
    }
  };

  const getMaintenanceStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return '#22C55E'; // Green
      case 'Stale':
        return '#CA8A04'; // Yellow
      case 'Abandoned':
        return '#DC2626'; // Red
      case 'Unknown':
      default:
        return 'var(--color-secondary)'; // Gray
    }
  };

  const formatDaysSincePublish = (isoDate) => {
    if (!isoDate) return 'N/A';
    
    try {
      const days = Math.floor((Date.now() - new Date(isoDate)) / (1000 * 60 * 60 * 24));
      
      if (days < 30) {
        return `${days} days ago`;
      } else if (days < 365) {
        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
      } else {
        const years = Math.floor(days / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      return 'N/A';
    }
  };

  if (!report) return null;

  // Safe vulnerability count
  const vulnCount = Array.isArray(report.vulnerabilities) ? report.vulnerabilities.length : 0;

  return (
    <div className="nutrition-label">
      {/* Section 1: Package Info */}
      <section className="nutrition-section package-info">
        <h2>
          {report.packageInfo?.name || 'Unknown Package'}
          <span className="version">v{report.packageInfo?.version || '0.0.0'}</span>
        </h2>
        <p className="description">{report.packageInfo?.description || 'No description available'}</p>
        <div>
          <span className="license-badge">{report.packageInfo?.license || 'Unknown'}</span>
          {report.packageInfo?.repository && (
            <a
              href={report.packageInfo.repository}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 'var(--spacing-md)' }}
            >
              View Repository
            </a>
          )}
        </div>
        <p className="text-muted" style={{ marginTop: 'var(--spacing-sm)' }}>
          {report.packageInfo?.maintainers?.length || 0} maintainers
        </p>
      </section>

      {/* Section 2: License & Maintenance */}
      <section className="nutrition-section license-maintenance">
        <h3>License & Maintenance</h3>
        
        {/* License Information */}
        <div className="license-info">
          <h4>License</h4>
          <div className="license-type">{report.packageInfo?.license || 'Unknown'}</div>
          {report.maintenanceInfo?.licenseCompatibility && (
            <p className="license-compatibility">
              Type: {report.maintenanceInfo.licenseCompatibility}
            </p>
          )}
        </div>

        {/* Maintenance Status */}
        <div className="maintenance-status" style={{ marginTop: 'var(--spacing-md)' }}>
          <h4>Maintenance Status</h4>
          <div 
            className="status-badge"
            style={{ 
              backgroundColor: getMaintenanceStatusColor(report.maintenanceInfo?.maintenanceStatus),
              color: 'white',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-block'
            }}
          >
            {report.maintenanceInfo?.maintenanceStatus || 'Unknown'}
          </div>
          
          {/* Last Publish Date */}
          {report.maintenanceInfo?.lastPublishDate && (
            <p className="text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
              Last published: {formatDaysSincePublish(report.maintenanceInfo.lastPublishDate)}
            </p>
          )}
          
          {/* GitHub Stats */}
          {report.maintenanceInfo?.githubStats?.openIssues !== undefined && (
            <p className="text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
              Open issues/PRs: {report.maintenanceInfo.githubStats.openIssues}
            </p>
          )}
          
          {/* Maintenance Notes from AI */}
          {report.maintenanceInfo?.maintenanceNotes && (
            <p style={{ marginTop: 'var(--spacing-sm)' }}>
              {report.maintenanceInfo.maintenanceNotes}
            </p>
          )}
        </div>
      </section>

      {/* Section 3: Dependencies */}
      <section className="nutrition-section dependencies">
        <h3>Dependencies</h3>
        <div className="stat-large">{report.dependencyTree?.total || 0}</div>
        <p className="text-muted">Direct Dependencies</p>
        {report.dependencyTree?.total > 0 ? (
          <DependencyTree 
            tree={report.dependencyTree.transitive}
            dependencies={report.dependencyTree.direct} 
            total={report.dependencyTree.total} 
          />
        ) : (
          <p className="text-muted" style={{ marginTop: 'var(--spacing-md)' }}>
            No dependencies (standalone package)
          </p>
        )}
      </section>

      {/* Section 4: Vulnerabilities */}
      <section className="nutrition-section vulnerabilities">
        <h3>Security Vulnerabilities</h3>
        <div className="stat-large">{vulnCount}</div>
        <p className="text-muted">Total Vulnerabilities</p>
        
        {vulnCount === 0 ? (
          <div className="no-vulnerabilities" style={{ marginTop: 'var(--spacing-md)' }}>
            ✓ No known vulnerabilities found
          </div>
        ) : (
          <>
            {/* Severity breakdown */}
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              {report.vulnerabilitiesBySeverity?.critical?.length > 0 && (
                <span
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor('critical') }}
                >
                  {report.vulnerabilitiesBySeverity.critical.length} Critical
                </span>
              )}
              {report.vulnerabilitiesBySeverity?.high?.length > 0 && (
                <span
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor('high') }}
                >
                  {report.vulnerabilitiesBySeverity.high.length} High
                </span>
              )}
              {report.vulnerabilitiesBySeverity?.medium?.length > 0 && (
                <span
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor('medium') }}
                >
                  {report.vulnerabilitiesBySeverity.medium.length} Medium
                </span>
              )}
              {report.vulnerabilitiesBySeverity?.low?.length > 0 && (
                <span
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor('low') }}
                >
                  {report.vulnerabilitiesBySeverity.low.length} Low
                </span>
              )}
            </div>

            {/* Detailed vulnerability list */}
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              {['critical', 'high', 'medium', 'low'].map((severity) => {
                const vulns = report.vulnerabilitiesBySeverity?.[severity] || [];
                if (vulns.length === 0) return null;

                return (
                  <div key={severity}>
                    <h4 style={{ textTransform: 'capitalize' }}>{severity} Severity</h4>
                    {vulns.map((vuln) => (
                      <div
                        key={vuln.id || `${vuln.package}-${vuln.summary?.substring(0, 20)}`}
                        className={`vulnerability-item ${severity}`}
                      >
                        <strong>{vuln.id || 'Unknown ID'}</strong>
                        <span className="package-name" style={{ marginLeft: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                          {vuln.package || 'Unknown package'}
                        </span>
                        <p className="vuln-summary" style={{ marginTop: 'var(--spacing-xs)' }}>
                          {vuln.summary || 'No summary available'}
                        </p>
                        {vuln.cvssScore && (
                          <span className="cvss-score" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                            CVSS: {vuln.cvssScore}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Section 5: AI Summary */}
      <section className="nutrition-section ai-summary">
        <h3>AI-Powered Analysis</h3>
        {!report.aiSummary ? (
          <div className="ai-unavailable">
            AI analysis unavailable. Manual review recommended.
          </div>
        ) : (
          <>
            <div
              className="risk-level"
              style={{ color: getSeverityColor(report.aiSummary.riskLevel) }}
            >
              {report.aiSummary.riskLevel || 'Unknown'} Risk
            </div>

            {report.aiSummary.concerns && report.aiSummary.concerns.length > 0 && (
              <>
                <h4>Key Concerns</h4>
                <ul>
                  {report.aiSummary.concerns.map((concern, index) => (
                    <li key={index}>{concern}</li>
                  ))}
                </ul>
              </>
            )}

            {report.aiSummary.recommendations && report.aiSummary.recommendations.length > 0 && (
              <>
                <h4>Recommendations</h4>
                <ul>
                  {report.aiSummary.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </>
            )}

            {report.aiSummary.complexityAssessment && (
              <>
                <h4>Complexity Assessment</h4>
                <p>{report.aiSummary.complexityAssessment}</p>
              </>
            )}
          </>
        )}
      </section>

      {/* Section 6: Metadata */}
      <footer className="nutrition-footer">
        <ExportButton report={report} />
        <div style={{ marginBottom: 'var(--spacing-md)' }}></div>
        <p>Analyzed on {formatDate(report.metadata?.analyzedAt)}</p>
        <p>Analysis completed in {formatAnalysisTime(report.metadata?.analysisTime)}</p>
      </footer>
    </div>
  );
}

export default NutritionLabel;

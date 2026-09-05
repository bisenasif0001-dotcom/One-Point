import * as Icons from 'lucide-react';

export const Icon = ({ name, size = 16, color, style, className, ...rest }: any) => {
  const pascalName = name.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const Comp = (Icons as any)[pascalName];
  const iconStyle = { ...style, color: color || style?.color, width: size, height: size };
  if (!Comp) return <span className={className} style={{ ...iconStyle, display: 'inline-block' }} {...rest} />;
  return <Comp className={className} size={size} style={iconStyle} {...rest} />;
};

export const PanelHeader = ({ title, sub, actions, className = '', style }: any) => (
  <div className={`page-header ${className}`.trim()} style={style}>
    <div>
      <div className="page-title">{title}</div>
      <div className="page-sub">{sub}</div>
    </div>
    {actions && <div className="header-actions">{actions}</div>}
  </div>
);

export const Card = ({
  title,
  sub,
  right,
  actions,
  children,
  bodyClass = 'card-body',
  bodyStyle,
  className = '',
  style,
}: any) => {
  const headerRight = actions ?? right;
  const hasHeader = Boolean(title || sub || headerRight);

  return (
    <div className={`card ${className}`.trim()} style={style}>
      {hasHeader && (
        <div className="card-header">
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {headerRight && <div className="card-actions">{headerRight}</div>}
        </div>
      )}
      <div className={bodyClass} style={bodyStyle}>{children}</div>
    </div>
  );
};

export const Badge = ({ type = 'neutral', dot, children, className = '', style, ...rest }: any) => {
  return (
    <span className={`badge badge-${type} ${className}`.trim()} style={style} {...rest}>
      {dot && <span className="badge-dot" style={typeof dot === 'string' ? { background: dot } : undefined} />}
      {children}
    </span>
  );
};

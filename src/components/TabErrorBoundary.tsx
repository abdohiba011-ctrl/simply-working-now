import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface TabErrorBoundaryProps {
  children: ReactNode;
  tabName?: string;
  onRetry?: () => void;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[TabErrorBoundary] Error in ${this.props.tabName || 'tab'}:`, error);
    console.error('[TabErrorBoundary] Error info:', errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {this.props.tabName ? `Error loading ${this.props.tabName}` : 'Something went wrong'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                An error occurred while loading this section. Please try again or contact support if the problem persists.
              </p>
              {this.state.error && (
                <p className="text-xs text-destructive/80 mb-4 font-mono bg-destructive/10 p-2 rounded max-w-lg mx-auto overflow-auto">
                  {this.state.error.message}
                </p>
              )}
              <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

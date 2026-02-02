'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Settings,
    Bell,
    Shield,
    Database,
    Bot,
    MessageSquare,
    Save,
    RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Settings</h1>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            General Settings
                        </CardTitle>
                        <CardDescription>
                            Basic configuration for the admin dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="clinicName">Clinic Name</Label>
                            <Input id="clinicName" defaultValue="Glow Aesthetics" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <Input id="timezone" defaultValue="Asia/Jakarta (WIB)" disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="language">Language</Label>
                            <Input id="language" defaultValue="Indonesian" disabled />
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notifications
                        </CardTitle>
                        <CardDescription>
                            Configure notification preferences
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">New Handoff Alerts</p>
                                <p className="text-sm text-muted-foreground">Get notified when a handoff is requested</p>
                            </div>
                            <Badge>Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Escalation Alerts</p>
                                <p className="text-sm text-muted-foreground">Get notified for escalated conversations</p>
                            </div>
                            <Badge>Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Daily Summary</p>
                                <p className="text-sm text-muted-foreground">Receive daily analytics summary</p>
                            </div>
                            <Badge variant="secondary">Disabled</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            AI Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure AI chatbot behavior
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>AI Model</Label>
                            <div className="flex items-center gap-2">
                                <Input defaultValue="Claude 3.5 Sonnet" disabled />
                                <Badge className="bg-green-500">Active</Badge>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Auto-Handoff Threshold</Label>
                            <Input type="number" defaultValue="3" />
                            <p className="text-xs text-muted-foreground">
                                Number of failed attempts before suggesting handoff
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Response Style</Label>
                            <Input defaultValue="Professional & Friendly" disabled />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security
                        </CardTitle>
                        <CardDescription>
                            Security and access settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Session Duration</p>
                                <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
                            </div>
                            <Badge variant="outline">7 days</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Two-Factor Auth</p>
                                <p className="text-sm text-muted-foreground">Additional security layer</p>
                            </div>
                            <Badge variant="secondary">Not configured</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Audit Logging</p>
                                <p className="text-sm text-muted-foreground">Track all admin actions</p>
                            </div>
                            <Badge className="bg-green-500">Enabled</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Database Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Database
                        </CardTitle>
                        <CardDescription>
                            Database connection information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge className="bg-green-500">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Type</span>
                            <span>PostgreSQL 16</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Host</span>
                            <span className="font-mono text-sm">localhost:5433</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Integration Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            Integrations
                        </CardTitle>
                        <CardDescription>
                            Connected services status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>WhatsApp Business</span>
                            <Badge variant="secondary">Not Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Pinecone (Vector DB)</span>
                            <Badge className="bg-green-500">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Anthropic API</span>
                            <Badge className="bg-green-500">Connected</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Note */}
            <div className="text-center text-sm text-muted-foreground pt-4">
                <p>Some settings are read-only in demo mode.</p>
                <p>Contact administrator to modify system configuration.</p>
            </div>
        </div>
    );
}

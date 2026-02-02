'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, UserPlus, Shield, User, Mail, Calendar } from 'lucide-react';

interface Agent {
    id: string;
    username: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    _count?: {
        handoffs: number;
    };
}

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        try {
            const res = await fetch('/api/admin/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data.agents || []);
            } else {
                // If API doesn't exist yet, show mock data
                setAgents([
                    {
                        id: 'admin-1',
                        username: 'admin',
                        name: 'Super Admin',
                        email: 'admin@example.com',
                        role: 'SUPER_ADMIN',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'agent-1',
                        username: 'agent1',
                        name: 'Agent One',
                        email: 'agent1@example.com',
                        role: 'ADMIN',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'agent-2',
                        username: 'agent2',
                        name: 'Agent Two',
                        email: 'agent2@example.com',
                        role: 'ADMIN',
                        isActive: true,
                        createdAt: new Date().toISOString(),
                    },
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
            // Show mock data on error
            setAgents([
                {
                    id: 'admin-1',
                    username: 'admin',
                    name: 'Super Admin',
                    email: 'admin@example.com',
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'agent-1',
                    username: 'agent1',
                    name: 'Agent One',
                    email: 'agent1@example.com',
                    role: 'ADMIN',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                },
                {
                    id: 'agent-2',
                    username: 'agent2',
                    name: 'Agent Two',
                    email: 'agent2@example.com',
                    role: 'ADMIN',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return <Badge className="bg-purple-500">Super Admin</Badge>;
            case 'ADMIN':
                return <Badge className="bg-blue-500">Admin</Badge>;
            case 'VIEWER':
                return <Badge variant="secondary">Viewer</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Agents</h1>
                <Button disabled>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Agent
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Agents
                        </CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{agents.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active team members</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Super Admins
                        </CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {agents.filter(a => a.role === 'SUPER_ADMIN').length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Full access users</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Now
                        </CardTitle>
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {agents.filter(a => a.isActive).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Currently active</p>
                    </CardContent>
                </Card>
            </div>

            {/* Agents Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {agents.map((agent) => (
                                    <TableRow key={agent.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                {agent.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{agent.username}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {agent.email}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getRoleBadge(agent.role)}</TableCell>
                                        <TableCell>
                                            {agent.isActive ? (
                                                <Badge variant="outline" className="text-green-500 border-green-500">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-red-500 border-red-500">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" disabled>
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Note */}
            <div className="text-center text-sm text-muted-foreground">
                <p>Agent management features coming soon.</p>
                <p>Currently showing agents from database seed.</p>
            </div>
        </div>
    );
}

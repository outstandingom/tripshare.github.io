<script>
    // Supabase Configuration
    const SUPABASE_URL = 'https://oimtrjuxagzvmbllgehi.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXRyanV4YWd6dm1ibGxnZWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3Nzk5NzksImV4cCI6MjA3ODM1NTk3OX0.hAQ7DQFfOAU5tMDj4Zc_4MyXVl10dhquQwd70OT46tg';

    // Initialize Supabase client
    let supabase;
    let currentUser = null;
    let currentUserId = null;
    let sentRequests = [];
    let receivedRequests = [];
    let currentSelectedRequest = null;
    let currentAction = null;

    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage
            }
        });
        console.log('Supabase client initialized successfully');
        window.supabaseClient = supabase;
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
        window.supabaseClient = null;
    }

    // Global functions for onclick handlers
    window.cancelRequest = async function(requestId) {
        if (!confirm('Are you sure you want to cancel this request?')) return;
        
        try {
            const { error } = await supabase
                .from('trip_requests')
                .update({ status: 'cancelled' })
                .eq('id', requestId);

            if (error) throw error;

            alert('Request cancelled successfully!');
            
            // Refresh data
            loadSentRequests();
            
        } catch (error) {
            console.error('Error cancelling request:', error);
            showError('Error cancelling request');
        }
    };

    window.acceptRequest = async function(requestId) {
        if (!confirm('Are you sure you want to accept this request?')) return;
        
        try {
            const request = receivedRequests.find(r => r.id === requestId);
            if (!request) return;

            // Accept the request
            const { error } = await supabase
                .from('trip_requests')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            if (error) throw error;

            // Update available seats in the trip
            const { error: tripError } = await supabase
                .from('trips')
                .update({ 
                    seats_available: request.trips.seats_available - request.seats_requested 
                })
                .eq('id', request.trip_id);

            if (tripError) throw tripError;

            alert('Request accepted successfully!');
            
            // Refresh data
            loadReceivedRequests();
            
        } catch (error) {
            console.error('Error accepting request:', error);
            showError('Error accepting request');
        }
    };

    window.rejectRequest = async function(requestId) {
        if (!confirm('Are you sure you want to reject this request?')) return;
        
        try {
            const { error } = await supabase
                .from('trip_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);

            if (error) throw error;

            alert('Request rejected successfully!');
            
            // Refresh data
            loadReceivedRequests();
            
        } catch (error) {
            console.error('Error rejecting request:', error);
            showError('Error rejecting request');
        }
    };

    window.viewRequestDetails = function(requestId, type) {
        let request;
        
        if (type === 'sent') {
            request = sentRequests.find(r => r.id === requestId);
        } else {
            request = receivedRequests.find(r => r.id === requestId);
        }
        
        if (!request) {
            console.error('Request not found:', requestId);
            return;
        }
        
        currentSelectedRequest = request;
        const trip = request.trips;
        const user = type === 'sent' ? trip.users : request.users;
        const userInitials = getInitials(user.full_name);
        
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div class="route" style="font-size: 1.3rem;">
                    <i class="fas fa-route"></i>
                    ${trip.start_location} → ${trip.end_location}
                </div>
                <div class="date-time">
                    <i class="far fa-calendar"></i>
                    ${formatDateTime(trip.departure_datetime)}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Request Status</div>
                    <div class="status-badge status-${request.status}" style="display: inline-block; margin-top: 0.3rem;">
                        ${request.status}
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Seats Requested</div>
                    <div style="font-weight: 600;">${request.seats_requested}</div>
                </div>
                <div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Price</div>
                    <div style="font-weight: 600;">₹${trip.price_per_seat || trip.total_price} ${trip.price_type === 'perSeat' ? 'per seat' : 'total'}</div>
                </div>
                <div>
                    <div style="font-size: 0.9rem; color: var(--text-light);">Vehicle</div>
                    <div style="font-weight: 600;">${trip.vehicle_type} ${trip.vehicle_model || ''}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${type === 'sent' ? 'Driver' : 'Passenger'} Information</div>
                <div class="user-info">
                    <div class="user-img">${userInitials}</div>
                    <div>
                        <div class="user-name">${user.full_name}</div>
                        <div class="rating">
                            <i class="fas fa-star"></i>
                            <span>${user.rating || '5.0'} (${user.total_trips || 0} trips)</span>
                        </div>
                    </div>
                </div>
            </div>
            
            ${request.message ? `
            <div style="margin-bottom: 1.5rem;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Message from ${type === 'sent' ? 'you' : 'passenger'}</div>
                <div style="background: #F8FAFC; border-radius: 8px; padding: 1rem;">${request.message}</div>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 1.5rem;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Request Date</div>
                <div>${formatDateTime(request.created_at)}</div>
            </div>
        `;
        
        // Update modal buttons based on context
        const confirmBtn = document.getElementById('confirmAction');
        const cancelBtn = document.getElementById('cancelAction');
        
        if (type === 'received' && request.status === 'pending') {
            confirmBtn.style.display = 'flex';
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> Accept Request';
            currentAction = 'accept';
        } else {
            confirmBtn.style.display = 'none';
        }
        
        cancelBtn.innerHTML = 'Close';
        
        document.getElementById('requestDetailsModal').style.display = 'flex';
    };

    window.completeTrip = async function(tripId, requestId) {
        if (!confirm('Are you sure you want to mark this trip as completed?')) return;
        
        try {
            // Update trip status to completed
            const { error: tripError } = await supabase
                .from('trips')
                .update({ status: 'completed' })
                .eq('id', tripId);

            if (tripError) throw tripError;

            // Update request status to completed
            const { error: requestError } = await supabase
                .from('trip_requests')
                .update({ status: 'completed' })
                .eq('id', requestId);

            if (requestError) throw requestError;

            alert('Trip marked as completed successfully!');
            
            // Refresh data
            loadSentRequests();
            loadReceivedRequests();
            
        } catch (error) {
            console.error('Error completing trip:', error);
            showError('Error completing trip');
        }
    };

    // Utility functions
    function formatDateTime(datetimeString) {
        try {
            const date = new Date(datetimeString);
            return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (e) {
            return 'Invalid date';
        }
    }

    function getInitials(name) {
        if (!name) return 'US';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    function showError(message) {
        alert(message);
    }

    function showLoadingState(gridId) {
        const grid = document.getElementById(gridId);
        grid.innerHTML = `
            <div class="loading">
                <div>
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading...</p>
                </div>
            </div>
        `;
    }

    function showNoResults(gridId, message = 'No results found') {
        const grid = document.getElementById(gridId);
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-inbox"></i>
                <h3>${message}</h3>
            </div>
        `;
    }

    // Main functions
    async function loadSentRequests() {
        try {
            showLoadingState('sentRequestsGrid');
            
            const { data: requests, error } = await supabase
                .from('trip_requests')
                .select(`
                    *,
                    trips(
                        *,
                        users(full_name, rating, total_trips)
                    )
                `)
                .eq('passenger_id', currentUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            sentRequests = requests || [];
            displaySentRequests(sentRequests);
            
        } catch (error) {
            console.error('Error loading sent requests:', error);
            showError('Error loading your requests');
            showNoResults('sentRequestsGrid');
        }
    }

    async function loadReceivedRequests() {
        try {
            showLoadingState('receivedRequestsGrid');
            
            // Get trips created by current user
            const { data: userTrips, error: tripsError } = await supabase
                .from('trips')
                .select('id')
                .eq('driver_id', currentUserId);

            if (tripsError) throw tripsError;

            const tripIds = userTrips ? userTrips.map(trip => trip.id) : [];
            
            if (tripIds.length === 0) {
                showNoResults('receivedRequestsGrid', 'You have no active trips');
                return;
            }

            // Get requests for user's trips
            const { data: requests, error } = await supabase
                .from('trip_requests')
                .select(`
                    *,
                    trips(
                        *,
                        users(full_name, rating, total_trips)
                    ),
                    users(full_name, rating, total_trips)
                `)
                .in('trip_id', tripIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            receivedRequests = requests || [];
            displayReceivedRequests(receivedRequests);
            
        } catch (error) {
            console.error('Error loading received requests:', error);
            showError('Error loading received requests');
            showNoResults('receivedRequestsGrid');
        }
    }

    function displaySentRequests(requests) {
        const grid = document.getElementById('sentRequestsGrid');
        
        if (requests.length === 0) {
            showNoResults('sentRequestsGrid', 'You have not sent any trip requests yet');
            return;
        }
        
        grid.innerHTML = '';
        
        requests.forEach(request => {
            const trip = request.trips;
            if (!trip) return;
            
            const driver = trip.users;
            const driverInitials = getInitials(driver?.full_name || 'Driver');
            
            const requestCard = document.createElement('div');
            requestCard.className = 'alert-card';
            
            requestCard.innerHTML = `
                <div class="alert-header">
                    <div>
                        <div class="route">
                            <i class="fas fa-route"></i>
                            ${trip.start_location} → ${trip.end_location}
                        </div>
                        <div class="date-time">
                            <i class="far fa-calendar"></i>
                            ${formatDateTime(trip.departure_datetime)}
                        </div>
                    </div>
                    <div class="status-badge status-${request.status}">
                        ${request.status}
                    </div>
                </div>
                
                <div class="alert-details">
                    <div class="detail">
                        <div class="detail-value">${request.seats_requested}</div>
                        <div class="detail-label">Seats Requested</div>
                    </div>
                    <div class="detail">
                        <div class="detail-value">₹${trip.price_per_seat || trip.total_price || 0}</div>
                        <div class="detail-label">${trip.price_type === 'perSeat' ? 'Per Seat' : 'Total'}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-value">${trip.vehicle_type}</div>
                        <div class="detail-label">Vehicle</div>
                    </div>
                </div>
                
                <div class="user-info">
                    <div class="user-img">${driverInitials}</div>
                    <div>
                        <div class="user-name">${driver?.full_name || 'Driver'}</div>
                        <div class="rating">
                            <i class="fas fa-star"></i>
                            <span>${driver?.rating || '5.0'} (${driver?.total_trips || 0})</span>
                        </div>
                    </div>
                </div>
                
                <div class="alert-actions">
                    ${request.status === 'pending' ? `
                        <button class="action-btn btn-cancel" onclick="cancelRequest('${request.id}')">
                            <i class="fas fa-times"></i> Cancel Request
                        </button>
                    ` : ''}
                    ${request.status === 'accepted' ? `
                        <button class="action-btn btn-complete" onclick="completeTrip('${request.trip_id}', '${request.id}')">
                            <i class="fas fa-check-circle"></i> Mark Complete
                        </button>
                    ` : ''}
                    <button class="action-btn btn-view" onclick="viewRequestDetails('${request.id}', 'sent')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            `;
            
            grid.appendChild(requestCard);
        });
    }

    function displayReceivedRequests(requests) {
        const grid = document.getElementById('receivedRequestsGrid');
        
        if (requests.length === 0) {
            showNoResults('receivedRequestsGrid', 'You have no pending requests for your trips');
            return;
        }
        
        grid.innerHTML = '';
        
        requests.forEach(request => {
            const trip = request.trips;
            if (!trip) return;
            
            const passenger = request.users;
            const passengerInitials = getInitials(passenger?.full_name || 'Passenger');
            
            const requestCard = document.createElement('div');
            requestCard.className = 'alert-card';
            
            requestCard.innerHTML = `
                <div class="alert-header">
                    <div>
                        <div class="route">
                            <i class="fas fa-route"></i>
                            ${trip.start_location} → ${trip.end_location}
                        </div>
                        <div class="date-time">
                            <i class="far fa-calendar"></i>
                            ${formatDateTime(trip.departure_datetime)}
                        </div>
                    </div>
                    <div class="status-badge status-${request.status}">
                        ${request.status}
                    </div>
                </div>
                
                <div class="alert-details">
                    <div class="detail">
                        <div class="detail-value">${request.seats_requested}</div>
                        <div class="detail-label">Seats Requested</div>
                    </div>
                    <div class="detail">
                        <div class="detail-value">₹${trip.price_per_seat || trip.total_price || 0}</div>
                        <div class="detail-label">${trip.price_type === 'perSeat' ? 'Per Seat' : 'Total'}</div>
                    </div>
                    <div class="detail">
                        <div class="detail-value">${trip.vehicle_type}</div>
                        <div class="detail-label">Vehicle</div>
                    </div>
                </div>
                
                <div class="user-info">
                    <div class="user-img">${passengerInitials}</div>
                    <div>
                        <div class="user-name">${passenger?.full_name || 'Passenger'}</div>
                        <div class="rating">
                            <i class="fas fa-star"></i>
                            <span>${passenger?.rating || '5.0'} (${passenger?.total_trips || 0})</span>
                        </div>
                    </div>
                </div>
                
                ${request.status === 'pending' ? `
                    <div class="alert-actions">
                        <button class="action-btn btn-accept" onclick="acceptRequest('${request.id}')">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="action-btn btn-reject" onclick="rejectRequest('${request.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="action-btn btn-view" onclick="viewRequestDetails('${request.id}', 'received')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                ` : `
                    <div class="alert-actions">
                        ${request.status === 'accepted' ? `
                            <button class="action-btn btn-complete" onclick="completeTrip('${request.trip_id}', '${request.id}')">
                                <i class="fas fa-check-circle"></i> Mark Complete
                            </button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="viewRequestDetails('${request.id}', 'received')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                `}
            `;
            
            grid.appendChild(requestCard);
        });
    }

    // Event listeners and initialization
    document.addEventListener('DOMContentLoaded', function() {
        const profileDropdown = document.getElementById('profileDropdown');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const logoutBtn = document.getElementById('logoutBtn');

        // Profile dropdown toggle
        profileDropdown.addEventListener('click', function() {
            dropdownMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!profileDropdown.contains(event.target)) {
                dropdownMenu.classList.remove('active');
            }
        });
        
        // Logout functionality
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error during logout:', error);
                showError('An error occurred during logout');
            }
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                document.getElementById(`${tabId}Tab`).classList.add('active');
            });
        });
        
        // Apply filters
        document.getElementById('applyFilters').addEventListener('click', function() {
            const filterDate = document.getElementById('filterDate').value;
            const filterStatus = document.getElementById('filterStatus').value;
            const filterType = document.getElementById('filterType').value;
            
            let filteredSent = [...sentRequests];
            let filteredReceived = [...receivedRequests];
            
            if (filterDate) {
                filteredSent = filteredSent.filter(request => {
                    const requestDate = new Date(request.created_at).toISOString().split('T')[0];
                    return requestDate === filterDate;
                });
                filteredReceived = filteredReceived.filter(request => {
                    const requestDate = new Date(request.created_at).toISOString().split('T')[0];
                    return requestDate === filterDate;
                });
            }
            
            if (filterStatus !== 'all') {
                filteredSent = filteredSent.filter(request => request.status === filterStatus);
                filteredReceived = filteredReceived.filter(request => request.status === filterStatus);
            }
            
            if (filterType === 'sent') {
                document.querySelector('.tab[data-tab="sent"]').click();
            } else if (filterType === 'received') {
                document.querySelector('.tab[data-tab="received"]').click();
            }
            
            displaySentRequests(filteredSent);
            displayReceivedRequests(filteredReceived);
        });
        
        // Modal close
        document.getElementById('closeModal').addEventListener('click', function() {
            document.getElementById('requestDetailsModal').style.display = 'none';
        });
        
        // Cancel action
        document.getElementById('cancelAction').addEventListener('click', function() {
            document.getElementById('requestDetailsModal').style.display = 'none';
        });
        
        // Confirm action
        document.getElementById('confirmAction').addEventListener('click', async function() {
            if (!currentSelectedRequest || !currentAction) return;
            
            try {
                if (currentAction === 'accept') {
                    const { error } = await supabase
                        .from('trip_requests')
                        .update({ status: 'accepted' })
                        .eq('id', currentSelectedRequest.id);

                    if (error) throw error;

                    const { error: tripError } = await supabase
                        .from('trips')
                        .update({ 
                            seats_available: currentSelectedRequest.trips.seats_available - currentSelectedRequest.seats_requested 
                        })
                        .eq('id', currentSelectedRequest.trip_id);

                    if (tripError) throw tripError;

                    alert('Request accepted successfully!');
                }
                
                document.getElementById('requestDetailsModal').style.display = 'none';
                loadSentRequests();
                loadReceivedRequests();
                
            } catch (error) {
                console.error('Error confirming action:', error);
                showError('Error processing request');
            }
        });

        // Initialize the page
        initializePage();
    });

    async function initializePage() {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                showError('Please log in to view alerts');
                return;
            }

            currentUser = user;

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, full_name')
                .eq('auth_id', user.id)
                .single();

            if (userError) throw userError;
            
            currentUserId = userData.id;
            document.getElementById('navAvatar').textContent = getInitials(userData.full_name);

            await loadSentRequests();
            await loadReceivedRequests();
            
        } catch (error) {
            console.error('Error initializing page:', error);
            showError('An unexpected error occurred');
        }
    }
</script>

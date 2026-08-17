from django.db import models

class NAApplication(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    applicant_name = models.CharField(max_length=200)
    email          = models.EmailField()
    land_type      = models.CharField(max_length=100)
    reference_no   = models.CharField(max_length=50, unique=True)
    submitted_at   = models.DateTimeField(auto_now_add=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    reviewed_at    = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.reference_no} - {self.applicant_name}"

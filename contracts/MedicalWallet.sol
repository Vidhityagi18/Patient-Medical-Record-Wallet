// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MedicalWallet {
    enum Role { None, Patient, Doctor, Admin }

    struct Patient {
        string name;
        uint age;
        string gender;
        string idType;
        string idNumber;
        string ipfsHash;
    }

    struct Doctor {
        string name;
        string specialization;
        uint experience;
        string licenseNumber;
        string ipfsHash;
    }

    address public admin;
    uint256 public patientCount;
    uint256 public doctorCount;

    mapping(address => Role) public userRoles;
    mapping(address => Patient) public patients;
    mapping(address => Doctor) public doctors;
    address[] public doctorAddresses;

    event PatientRegistered(address indexed patient, string name);
    event DoctorRegistered(address indexed doctor, string name);

    constructor() {
        admin = msg.sender;
        userRoles[msg.sender] = Role.Admin;
        patientCount = 1024;
        doctorCount = 256;
    }

    function registerPatient(
        string memory name,
        uint age,
        string memory gender,
        string memory idType,
        string memory idNumber,
        string memory ipfsHash
    ) external {
        require(userRoles[msg.sender] == Role.None, "Already registered");
        userRoles[msg.sender] = Role.Patient;
        patientCount++;

        patients[msg.sender] = Patient({
            name: name,
            age: age,
            gender: gender,
            idType: idType,
            idNumber: idNumber,
            ipfsHash: ipfsHash
        });

        emit PatientRegistered(msg.sender, name);
    }

    function registerDoctor(
        string memory name,
        string memory specialization,
        uint experience,
        string memory licenseNumber,
        string memory ipfsHash
    ) external {
        require(userRoles[msg.sender] == Role.None, "Already registered");
        userRoles[msg.sender] = Role.Doctor;
        doctorCount++;

        doctors[msg.sender] = Doctor({
            name: name,
            specialization: specialization,
            experience: experience,
            licenseNumber: licenseNumber,
            ipfsHash: ipfsHash
        });

        doctorAddresses.push(msg.sender);

        emit DoctorRegistered(msg.sender, name);
    }

    function getUserRole(address user) external view returns (uint8) {
        return uint8(userRoles[user]);
    }

    function getDoctor(address user) external view returns (Doctor memory) {
        return doctors[user];
    }

    function getPatient(address user) external view returns (Patient memory) {
        return patients[user];
    }

    function getCounts() external view returns (uint256, uint256) {
        return (patientCount, doctorCount);
    }

    function getPatientHash(address _patient) public view returns (string memory) {
        return patients[_patient].ipfsHash;
    }

    function updatePatientHash(string memory newIpfsHash) external {
        require(userRoles[msg.sender] == Role.Patient, "Only patients can update");
        require(bytes(newIpfsHash).length > 0, "IPFS hash cannot be empty");
        patients[msg.sender].ipfsHash = newIpfsHash;
    }

    function updateDoctorHash(string memory newIpfsHash) external {
        require(userRoles[msg.sender] == Role.Doctor, "Only doctors can update");
        require(bytes(newIpfsHash).length > 0, "IPFS hash cannot be empty");
        doctors[msg.sender].ipfsHash = newIpfsHash;
    }
    // ✅ Appointment Status
enum AppointmentStatus { Requested, Approved, Rejected }

// ✅ Appointment Structure
struct Appointment {
    address patient;
    address doctor;
    uint date;      // timestamp
    uint time;      // store as HHMM (example: 1430 for 2:30 PM)
    AppointmentStatus status;
}

// ✅ Storage
mapping(address => Appointment[]) public patientAppointments;
mapping(address => Appointment[]) public doctorAppointments;

event AppointmentRequested(address indexed patient, address indexed doctor, uint date, uint time);
event AppointmentApproved(address indexed doctor, address indexed patient, uint index);
event AppointmentRejected(address indexed doctor, address indexed patient, uint index);

function requestAppointment(address doctor, uint date, uint time) external {
    require(userRoles[msg.sender] == Role.Patient, "Only patients can request");
    require(userRoles[doctor] == Role.Doctor, "Not a registered doctor");

    Appointment memory appt = Appointment({
        patient: msg.sender,
        doctor: doctor,
        date: date,
        time: time,
        status: AppointmentStatus.Requested
    });

    patientAppointments[msg.sender].push(appt);
    doctorAppointments[doctor].push(appt);

    emit AppointmentRequested(msg.sender, doctor, date, time);
}
function approveAppointment(uint index) external {
    require(userRoles[msg.sender] == Role.Doctor, "Only doctors can approve");

    Appointment storage appt = doctorAppointments[msg.sender][index];
    require(appt.status == AppointmentStatus.Requested, "Already processed");

    appt.status = AppointmentStatus.Approved;

    // update patient record too
    Appointment[] storage patientList = patientAppointments[appt.patient];
    for (uint i = 0; i < patientList.length; i++) {
        if (
            patientList[i].doctor == msg.sender &&
            patientList[i].date == appt.date &&
            patientList[i].time == appt.time
        ) {
            patientList[i].status = AppointmentStatus.Approved;
            break;
        }
    }

    emit AppointmentApproved(msg.sender, appt.patient, index);
}
function rejectAppointment(uint index) external {
    require(userRoles[msg.sender] == Role.Doctor, "Only doctors can reject");

    Appointment storage appt = doctorAppointments[msg.sender][index];
    require(appt.status == AppointmentStatus.Requested, "Already processed");

    appt.status = AppointmentStatus.Rejected;

    Appointment[] storage patientList = patientAppointments[appt.patient];
    for (uint i = 0; i < patientList.length; i++) {
        if (
            patientList[i].doctor == msg.sender &&
            patientList[i].date == appt.date &&
            patientList[i].time == appt.time
        ) {
            patientList[i].status = AppointmentStatus.Rejected;
            break;
        }
    }

    emit AppointmentRejected(msg.sender, appt.patient, index);
}
function getMyAppointments() external view returns (Appointment[] memory) {
    require(
        userRoles[msg.sender] == Role.Patient || 
        userRoles[msg.sender] == Role.Doctor, 
        "Not authorized"
    );

    return userRoles[msg.sender] == Role.Patient
        ? patientAppointments[msg.sender]
        : doctorAppointments[msg.sender];
}



// ✅ Doctor access to patient medical files
mapping(address => mapping(address => bool)) public doctorAccess; 
// patient => doctor => allowed
mapping(address => address[]) public pendingAccessRequests;

event AccessRequested(address indexed patient, address indexed doctor);
event AccessApproved(address indexed patient, address indexed doctor);

// ✅ Treatment / Prescription structs
struct Treatment {
    address doctor;
    string notes;
    uint timestamp;
}

struct Prescription {
    address doctor;
    string ipfsHash; // stored file
    uint timestamp;
}

mapping(address => Treatment[]) public patientTreatment;
mapping(address => Prescription[]) public patientPrescription;

function requestMedicalAccess(address patient) external {
    require(userRoles[msg.sender] == Role.Doctor, "Only doctors");
    pendingAccessRequests[patient].push(msg.sender);
    emit AccessRequested(patient, msg.sender);
}
function getPendingRequests(address patient) external view returns(address[] memory) {
    return pendingAccessRequests[patient];
}

function approveMedicalAccess(address doctor) external {
    require(userRoles[msg.sender] == Role.Patient, "Only patients");
    doctorAccess[msg.sender][doctor] = true;

    address[] storage req = pendingAccessRequests[msg.sender];
    for(uint i = 0; i < req.length; i++){
        if(req[i] == doctor){
            req[i] = req[req.length - 1];
            req.pop();
            break;
        }
    }

    emit AccessApproved(msg.sender, doctor);
}

function addTreatment(address patient, string memory notes) external {
    require(doctorAccess[patient][msg.sender], "No access");
    Treatment memory t = Treatment(msg.sender, notes, block.timestamp);
    patientTreatment[patient].push(t);
}

function uploadPrescription(address patient, string memory ipfsHash) external {
    require(doctorAccess[patient][msg.sender], "No access");
    Prescription memory p = Prescription(msg.sender, ipfsHash, block.timestamp);
    patientPrescription[patient].push(p);
}



function getAllDoctorsWithAddresses() external view returns (
    address[] memory, 
    Doctor[] memory
) {
    Doctor[] memory list = new Doctor[](doctorAddresses.length);

    for (uint i = 0; i < doctorAddresses.length; i++) {
        list[i] = doctors[doctorAddresses[i]];
    }

    return (doctorAddresses, list);
}

    
    function getAllDoctors() external view returns (Doctor[] memory) {
        Doctor[] memory list = new Doctor[](doctorAddresses.length);
        for (uint i = 0; i < doctorAddresses.length; i++) {
            list[i] = doctors[doctorAddresses[i]];
        }
        return list;
    }

    function getPatientTreatments(address patient) external view returns (Treatment[] memory) {
    return patientTreatment[patient];
}

function getPatientPrescriptions(address patient) external view returns (Prescription[] memory) {
    return patientPrescription[patient];
}
struct DoctorFile {
    address doctor;
    string ipfsHash;
    uint timestamp;
}

mapping(address => DoctorFile[]) public patientFiles;

function uploadDoctorFile(address patient, string memory ipfsHash) external {
    require(userRoles[msg.sender] == Role.Doctor, "Only doctors");
    require(doctorAccess[patient][msg.sender], "No access");

    DoctorFile memory f = DoctorFile(msg.sender, ipfsHash, block.timestamp);
    patientFiles[patient].push(f);
}

function getPatientFiles(address patient) external view returns(DoctorFile[] memory) {
    return patientFiles[patient];
}


    
}

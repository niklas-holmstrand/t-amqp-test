package user;

import com.mycronic.grpc.User.APIResponse;
import com.mycronic.grpc.User.Empty;
import com.mycronic.grpc.User.LoginRequest;
import com.mycronic.grpc.userGrpc.userImplBase;
import com.mycronic.grpc.User.GetMachinesDummy2Cmd;
import com.mycronic.grpc.User.GetMachinesDummy2Rsp;

import io.grpc.stub.StreamObserver;;

public class UserService extends userImplBase {

	@Override
	public void login(LoginRequest request, StreamObserver<APIResponse> responseObserver) {
		System.out.println("login started");
		
		String username = request.getUsername();
		String password = request.getPassword();
		String nicName = request.getNicName();
		
		APIResponse.Builder response = APIResponse.newBuilder();
		
		if(username.equals(password)) {
			response.setResponseCode(0).setResponsemessage("SUCCESS:" + nicName);
		} else {
			response.setResponseCode(100).setResponsemessage("INV PW");
		}
		
		responseObserver.onNext(response.build());
		responseObserver.onCompleted();
	}

	@Override
	public void logout(Empty request, StreamObserver<APIResponse> responseObserver) {
		System.out.println("logout started");

		APIResponse.Builder response = APIResponse.newBuilder();
		response.setResponseCode(0).setResponsemessage("LOGGED-OUT");

		
		responseObserver.onNext(response.build());
		responseObserver.onCompleted();

	}

	
	@Override
	public void getMachinesDummy2(GetMachinesDummy2Cmd request, StreamObserver<GetMachinesDummy2Rsp> responseObserver) {
		System.out.println("getMachinesDummy2 started");

		String machineFilter = request.getMachineFilter();
		Integer max = request.getMaxNoMachines();

		GetMachinesDummy2Rsp.Builder response = GetMachinesDummy2Rsp.newBuilder();
		response.setMachines("Bettan, Märta");

		
		responseObserver.onNext(response.build());
		responseObserver.onCompleted();

	}

	
	
}
